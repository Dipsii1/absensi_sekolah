import prisma from '../config/prisma'
import { StatusAbsensi } from '@prisma/client'
import { hitungStatusFinal } from '../helper/helperFinalAbsensi'

type Counts = Record<StatusAbsensi, number>

interface FinalResult {
  siswa_id: string
  tanggal: Date
  status_final: StatusAbsensi
  counts: Counts
  total_mapel: number
}

const emptyCounts = (): Counts => ({ Hadir: 0, Izin: 0, Sakit: 0, Alpha: 0 })

export async function hitungFinalAbsensiSiswa(siswa_id: string, tanggal: Date): Promise<FinalResult> {
  const absensiHarian = await prisma.absensiSiswa.findFirst({
    where: { siswa_id, tanggal, deleted_at: null },
    include: {
      detail: { where: { deleted_at: null }, select: { status: true } },
    },
  })

  const counts = emptyCounts()

  if (!absensiHarian) {
    counts.Alpha = 1
    return { siswa_id, tanggal, status_final: 'Alpha', counts, total_mapel: 0 }
  }

  if (absensiHarian.detail.length === 0) {
    const fallbackStatus = absensiHarian.status_harian && absensiHarian.status_harian in counts
      ? absensiHarian.status_harian
      : 'Alpha'
    counts[fallbackStatus] = 1
    return { siswa_id, tanggal, status_final: hitungStatusFinal(counts), counts, total_mapel: 0 }
  }

  for (const detail of absensiHarian.detail) {
    counts[detail.status] += 1
  }

  return {
    siswa_id,
    tanggal,
    status_final: hitungStatusFinal(counts),
    counts,
    total_mapel: absensiHarian.detail.length,
  }
}

export async function simpanFinalAbsensi(siswa_id: string, kelas_id: number, tanggal: Date) {
  const hasil = await hitungFinalAbsensiSiswa(siswa_id, tanggal)

  return prisma.finalAbsensi.upsert({
    where: { siswa_id_tanggal: { siswa_id, tanggal } },
    create: {
      siswa_id,
      kelas_id,
      tanggal,
      status_final: hasil.status_final,
      total_hadir: hasil.counts.Hadir,
      total_izin: hasil.counts.Izin,
      total_sakit: hasil.counts.Sakit,
      total_alpha: hasil.counts.Alpha,
      total_mapel: hasil.total_mapel,
      is_finalized: true,
      finalized_at: new Date(),
    },
    update: {
      status_final: hasil.status_final,
      total_hadir: hasil.counts.Hadir,
      total_izin: hasil.counts.Izin,
      total_sakit: hasil.counts.Sakit,
      total_alpha: hasil.counts.Alpha,
      total_mapel: hasil.total_mapel,
      is_finalized: true,
      finalized_at: new Date(),
    },
  })
}

export async function finalisasiAbsensiKelas(kelas_id: number, tanggal: Date) {
  const siswaDiKelas = await prisma.siswa.findMany({
    where: { kelas_id, status_siswa: 'Active', deleted_at: null },
    select: { id: true, nama: true },
  })

  let berhasil = 0
  let gagal = 0
  let dilewati = 0

  for (const siswa of siswaDiKelas) {
    try {
      await simpanFinalAbsensi(siswa.id, kelas_id, tanggal)
      berhasil++
    } catch (error) {
      console.error(`[FinalAbsensi] Gagal memproses siswa ${siswa.nama} (${siswa.id}):`, error)
      gagal++
    }
  }

  return { berhasil, gagal, dilewati }
}

export async function finalisasiSemuaKelasAktif(tanggal: Date) {
  const kelasAktif = await prisma.kelas.findMany({
    where: { status_kelas: 'Active', deleted_at: null, tahun: { is_active: true } },
    select: { id: true, kelas: true, jurusan: true },
  })

  const hasil = []
  for (const kelas of kelasAktif) {
    const rekap = await finalisasiAbsensiKelas(kelas.id, tanggal)
    hasil.push({ kelas_id: kelas.id, nama: `${kelas.kelas} ${kelas.jurusan}`, ...rekap })
  }

  return hasil
}

export { hitungStatusFinal }
