const { Worker } = require('bullmq')
const connection = require('../config/redis')
const prisma = require('../config/prisma')
const { sendTapOutNotification } = require('../services/telegramServices')
const { formatDate, formatTime, getTodayStrWIB, toDateOnly, getNowWIB } = require('../helper/indexUtils')
const { getHariFromDate } = require('../helper/daysUtils')

const tapOutWorker = new Worker('tap-out', async (job) => {
    const { siswaId, kelasId, siswaData, receivedAt } = job.data

    const todayStr = getTodayStrWIB()
    const todayDate = toDateOnly(todayStr)
    const hariIni = getHariFromDate(new Date(receivedAt))

    if (hariIni === 'Minggu') {
        throw new Error('Tidak ada jadwal di hari Minggu')
    }

    // Harus sudah tap in dulu sebelum bisa tap out
    const absensiHariIni = await prisma.absensiSiswa.findFirst({
        where: {
            siswa_id: siswaId,
            tanggal: todayDate,
            tap_in: { not: null },
            deleted_at: null
        }
    })

    if (!absensiHariIni) {
        throw new Error('Anda belum tap in hari ini, tidak bisa tap out')
    }

    if (absensiHariIni.tap_out) {
        console.log(`[TapOut Worker] Siswa ${siswaId} sudah tap out, skip.`)
        return { skipped: true, reason: 'already_tapped_out' }
    }

    // Validasi ke jadwal terakhir hari ini — tap out hanya sah di jam_selesai jadwal terakhir
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
        const kelas = siswaData?.kelas || await prisma.kelas.findUnique({
            where: { id: kelasId },
            select: { kelas: true, jurusan: true }
        })
        const namaKelas = kelas
            ? `${kelas.kelas} ${kelas.jurusan}`
            : 'yang dipilih'
        throw new Error(`Tidak ada jadwal untuk kelas ${namaKelas} di hari ${hariIni}, tidak bisa tap out`)
    }

    const nowWIB = getNowWIB()
    const jamSelesai = new Date(jadwalTerakhir.jam_selesai)
    const jamPulangWIB = new Date(nowWIB)
    jamPulangWIB.setHours(jamSelesai.getUTCHours(), jamSelesai.getUTCMinutes(), 0, 0)

    if (nowWIB < jamPulangWIB) {
        throw new Error(`Belum waktunya pulang. Jadwal pulang jam ${formatTime(jamPulangWIB)}`)
    }

    const tapOutTime = new Date(receivedAt)

    await prisma.absensiSiswa.update({
        where: { id: absensiHariIni.id },
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
    return { success: true, mode: 'tap_out', absensiId: absensiHariIni.id,tapInTime: absensiHariIni.tap_in, tapOutTime: absensiHariIni.tap_out }
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