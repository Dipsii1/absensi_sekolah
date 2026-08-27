const { Worker } = require('bullmq')
const connection = require('../config/redis')
const prisma = require('../config/prisma')
const { sendTapInNotification } = require('../services/telegramServices')
const { formatDate, formatTime, getTodayStrWIB, toDateOnly, getNowWIB } = require('../helper/indexUtils')
const { getHariFromDate } = require('../helper/daysUtils')

const tapInWorker = new Worker('tap-in', async (job) => {
    const { rfidId, siswaId, kelasId, siswaData, receivedAt } = job.data

    const todayStr = getTodayStrWIB()
    const todayDate = toDateOnly(todayStr)
    const hariIni = getHariFromDate(new Date(receivedAt))

    if (hariIni === 'Minggu') {
        throw new Error('Tidak ada jadwal di hari Minggu')
    }

    const existingAbsensi = await prisma.absensiSiswa.findFirst({
        where: {
            siswa_id: siswaId,
            tanggal: todayDate,
            tap_in: { not: null },
            deleted_at: null
        }
    })

    if (existingAbsensi) {
        console.log(`[TapIn Worker] Siswa ${siswaId} sudah tap in hari ini, skip.`)
        return { skipped: true, reason: 'already_tapped_in' }
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

    if (!jadwalPertama) {
        throw new Error(`Tidak ada jadwal untuk kelas_id ${kelasId} di hari ${hariIni}`)
    }

    const tapInTime = new Date(receivedAt)
    const nowWIB = getNowWIB()
    const jamMulai = new Date(jadwalPertama.jam_mulai)
    const jamMulaiWIB = new Date(jamMulai.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
    const threshold = new Date(nowWIB)
    threshold.setHours(jamMulaiWIB.getHours(), jamMulaiWIB.getMinutes(), 0, 0)

    const statusTapIn = nowWIB <= threshold ? 'Tepat_Waktu' : 'Terlambat'

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
            .catch(err => console.error('[TapIn Worker] Telegram error:', err.message))
    }

    console.log(`[TapIn Worker] Berhasil: siswa ${siswaId}, status: ${statusTapIn}`)
    return { success: true, absensiId: absensi.id, statusTapIn }
}, { connection, concurrency: 5 })

tapInWorker.on('failed', (job, err) => {
    console.error(`[TapIn Worker] Job ${job?.id} gagal:`, err.message)
})

tapInWorker.on('completed', (job, result) => {
    if (result?.skipped) {
        console.log(`[TapIn Worker] Job ${job.id} skipped: ${result.reason}`)
    }
})

module.exports = tapInWorker
