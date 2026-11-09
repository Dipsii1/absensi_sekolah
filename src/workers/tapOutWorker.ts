import { Hari } from '@prisma/client'
import { Worker } from 'bullmq'
import connection from '../config/redis'
import prisma from '../config/prisma'
import { sendTapOutNotification } from '../services/telegramServices'
import { formatDate, formatTime, formatJam, getTodayStrWIB, toDateOnly, wibTodayAt } from '../helper/indexUtils'
import { getHariFromDate } from '../helper/daysUtils'
import type { TapOutJobData } from '../queues/tapOutQueue'

const MIN_GAP_MINUTES = 5
const MIN_GAP_MS = MIN_GAP_MINUTES * 60 * 1000

const tapOutWorker = new Worker<TapOutJobData>(
  'tap-out',
  async (job) => {
    const { siswaId, kelasId, siswaData, receivedAt } = job.data

    const todayStr = getTodayStrWIB()
    const todayDate = toDateOnly(todayStr)
    const hariIni = getHariFromDate(new Date(receivedAt))

    if (hariIni === 'Minggu') {
      throw new Error('Tidak ada jadwal di hari Minggu')
    }

    const absensiHariIni = await prisma.absensiSiswa.findFirst({
      where: { siswa_id: siswaId, tanggal: todayDate, tap_in: { not: null }, deleted_at: null },
    })

    if (!absensiHariIni) {
      throw new Error('Anda belum tap in hari ini, tidak bisa tap out')
    }

    if (absensiHariIni.tap_out) {
      console.log(`[TapOut Worker] Siswa ${siswaId} sudah tap out, skip.`)
      return { skipped: true, reason: 'already_tapped_out' }
    }

    const receivedAtTime = new Date(receivedAt)
    const gapMs = receivedAtTime.getTime() - new Date(absensiHariIni.tap_in).getTime()

    if (gapMs < MIN_GAP_MS) {
      throw new Error(`Anda sudah Tap in pada jam ${formatTime(absensiHariIni.tap_in)}`)
    }

    const jadwalTerakhir = await prisma.jadwal.findFirst({
      where: { kelas_id: kelasId, hari: hariIni as Hari },
      include: { mata_pelajaran: true },
      orderBy: { jam_selesai: 'desc' },
    })

    if (!jadwalTerakhir) {
      const kelas = siswaData?.kelas ?? (await prisma.kelas.findUnique({ where: { id: Number(kelasId) }, select: { kelas: true, jurusan: true } }))
      const namaKelas = kelas ? `${kelas.kelas} ${kelas.jurusan}` : 'yang dipilih'
      throw new Error(`Tidak ada jadwal untuk kelas ${namaKelas} di hari ${hariIni}, tidak bisa tap out`)
    }

    const tapOutTime = new Date(receivedAt)
    const jamPulangWIB = wibTodayAt(jadwalTerakhir.jam_selesai)

    if (tapOutTime < jamPulangWIB) {
      throw new Error(`Belum waktunya pulang. Jadwal pulang jam ${formatJam(jadwalTerakhir.jam_selesai)}`)
    }

    const updatedAbsensi = await prisma.absensiSiswa.update({
      where: { id: absensiHariIni.id },
      data: { tap_out: tapOutTime },
    })

    if (siswaData.kelas && siswaData.kelas.telegram_group_id) {
      const notifData = {
        nama: siswaData.nama,
        kelas: `${siswaData.kelas.kelas} ${siswaData.kelas.jurusan}`,
        tap_out: formatTime(tapOutTime),
        tanggal: formatDate(todayDate),
      }
      sendTapOutNotification(siswaData.kelas.telegram_group_id, notifData).catch((err) =>
        console.error('[TapOut Worker] Telegram error:', err.message)
      )
    }

    console.log(`[TapOut Worker] Tap OUT berhasil: siswa ${siswaId}`)
    return {
      success: true,
      mode: 'tap_out',
      absensiId: absensiHariIni.id,
      tapInTime: absensiHariIni.tap_in,
      tapOutTime: updatedAbsensi.tap_out,
    }
  },
  { connection, concurrency: 5 },
)

tapOutWorker.on('failed', (job, err) => {
  console.error(`[TapOut Worker] Job ${job?.id} gagal:`, err.message)
})

tapOutWorker.on('completed', (job, result) => {
  if (result?.skipped) {
    console.log(`[TapOut Worker] Job ${job.id} skipped: ${result.reason}`)
  }
})

export default tapOutWorker