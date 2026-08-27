const { Worker } = require('bullmq')
const connection = require('../config/redis')
const prisma = require('../config/prisma')
const { sendTapInNotification, sendTapOutNotification } = require('../services/telegramServices')
const { formatDate, formatTime, getTodayStrWIB, toDateOnly, getNowWIB } = require('../helper/indexUtils')
const { getHariFromDate } = require('../helper/daysUtils')

const tapOutWorker = new Worker('tap-out', async (job) => {
    const { rfidId, siswaId, kelasId, siswaData, receivedAt } = job.data

    const todayStr = getTodayStrWIB()
    const todayDate = toDateOnly(todayStr)
    const hariIni = getHariFromDate(new Date(receivedAt))

    if (hariIni === 'Minggu') {
        throw new Error('Tidak ada jadwal di hari Minggu')
    }

    const jadwalTerakhir = await prisma.jadwal.findFirst({
        where: {
            kelas_id: kelasId,
            hari: hariIni,
            deleted_at: null
        },
        include: { mata_pelajaran: true },
        orderBy: { jam_selesai: 'desc' }
    })

    if (!jadwalTerakhir) {
        throw new Error(`Tidak ada jadwal untuk kelas_id ${kelasId} di hari ${hariIni}`)
    }

    const nowWIB = getNowWIB()
    const jamSelesai = new Date(jadwalTerakhir.jam_selesai)
    const jamSelesaiWIB = new Date(jamSelesai.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
    const jamPulangWIB = new Date(nowWIB)
    jamPulangWIB.setHours(jamSelesaiWIB.getHours(), jamSelesaiWIB.getMinutes(), 0, 0)

    if (nowWIB < jamPulangWIB) {
        const existingAbsensi = await prisma.absensiSiswa.findFirst({
            where: {
                siswa_id: siswaId,
                tanggal: todayDate,
                tap_in: { not: null },
                deleted_at: null
            }
        })

        if (existingAbsensi) {
            console.log(`[TapOut Worker] Siswa ${siswaId} sudah tap in, belum jam pulang, skip.`)
            return { skipped: true, reason: 'already_tapped_in_before_pulang' }
        }

        const jadwalPertama = await prisma.jadwal.findFirst({
            where: {
                kelas_id: kelasId,
                hari: hariIni,
                deleted_at: null
            },
            include: { mata_pelajaran: true },
            orderBy: { jam_mulai: 'asc' }
        })

        const tapInTime = new Date(receivedAt)
        const jamMulai = new Date(jadwalPertama.jam_mulai)
        const jamMulaiWIB = new Date(jamMulai.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
        const thresholdMasuk = new Date(nowWIB)
        thresholdMasuk.setHours(jamMulaiWIB.getHours(), jamMulaiWIB.getMinutes(), 0, 0)

        const statusTapIn = nowWIB <= thresholdMasuk ? 'Tepat_Waktu' : 'Terlambat'

        const absensi = await prisma.absensiSiswa.create({
            data: {
                siswa_id: siswaId,
                tanggal: todayDate,
                tap_in: tapInTime,
                rfid_id: rfidId,
                status_tapin: statusTapIn,
                status_harian: 'Hadir'
            }
        })

        if (siswaData.kelas && siswaData.kelas.telegram_group_id) {
            const notifData = {
                nama: siswaData.nama,
                kelas: `${siswaData.kelas.kelas} ${siswaData.kelas.jurusan}`,
                status_tapin: statusTapIn,
                tap_in: formatTime(tapInTime),
                tanggal: formatDate(todayDate),
            }
            sendTapInNotification(siswaData.kelas.telegram_group_id, notifData)
                .catch(err => console.error('[TapOut Worker] Telegram tap-in error:', err.message))
        }

        console.log(`[TapOut Worker] Tap IN otomatis: siswa ${siswaId}, status: ${statusTapIn}`)
        return { success: true, mode: 'tap_in_otomatis', absensiId: absensi.id, statusTapIn }
    }

    const absensiTapIn = await prisma.absensiSiswa.findFirst({
        where: {
            siswa_id: siswaId,
            tanggal: todayDate,
            tap_in: { not: null },
            deleted_at: null
        }
    })

    if (!absensiTapIn) {
        throw new Error('Belum melakukan tap in hari ini')
    }

    if (absensiTapIn.tap_out) {
        console.log(`[TapOut Worker] Siswa ${siswaId} sudah tap out, skip.`)
        return { skipped: true, reason: 'already_tapped_out' }
    }

    const tapOutTime = new Date(receivedAt)

    await prisma.absensiSiswa.update({
        where: { id: absensiTapIn.id },
        data: { tap_out: tapOutTime }
    })

    if (siswaData.kelas && siswaData.kelas.telegram_group_id) {
        const notifData = {
            nama: siswaData.nama,
            kelas: `${siswaData.kelas.kelas} ${siswaData.kelas.jurusan}`,
            tap_out: formatTime(tapOutTime),
            tanggal: formatDate(todayDate),
        }
        sendTapOutNotification(siswaData.kelas.telegram_group_id, notifData)
            .catch(err => console.error('[TapOut Worker] Telegram error:', err.message))
    }

    console.log(`[TapOut Worker] Tap OUT berhasil: siswa ${siswaId}`)
    return { success: true, mode: 'tap_out', absensiId: absensiTapIn.id }
}, { connection, concurrency: 5 })

tapOutWorker.on('failed', (job, err) => {
    console.error(`[TapOut Worker] Job ${job?.id} gagal:`, err.message)
})

tapOutWorker.on('completed', (job, result) => {
    if (result?.skipped) {
        console.log(`[TapOut Worker] Job ${job.id} skipped: ${result.reason}`)
    }
})

module.exports = tapOutWorker
