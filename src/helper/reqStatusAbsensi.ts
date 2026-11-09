import prisma from '../config/prisma'
import { StatusAbsensi } from '@prisma/client'
import { parseTanggal } from './dateUtils'
import { simpanFinalAbsensi } from '../services/finalAbsensi'

export interface ApplyStatusChangeParams {
  siswa_id: string
  kelas_id: string
  tanggal: string | Date
  walas_id: string | number
  status_baru: StatusAbsensi
  keterangan?: string
}

export async function applyStatusChange(params: ApplyStatusChangeParams) {
  const { siswa_id, kelas_id, tanggal, walas_id, status_baru, keterangan } = params
  const walasId = parseInt(String(walas_id), 10)
  const targetDate = parseTanggal(typeof tanggal === 'string' ? tanggal : new Date(tanggal).toISOString().slice(0, 10))

  let absensi: Awaited<ReturnType<typeof findOrCreateAbsensi>>

  absensi = await prisma.absensiSiswa.findFirst({
    where: { siswa_id, tanggal: targetDate, deleted_at: null },
    include: {
      detail: { where: { jadwal_id: null, guru_id: walasId, deleted_at: null } },
    },
  })

  if (!absensi) {
    absensi = await prisma.absensiSiswa.create({
      data: {
        siswa_id,
        tanggal: targetDate,
        tap_in: null,
        tap_out: null,
        status_tapin: null,
        rfid_id: null,
        status_harian: status_baru,
      },
      include: {
        detail: { where: { jadwal_id: null, guru_id: walasId, deleted_at: null } },
      },
    })
  }

  const existingDetail = absensi.detail?.[0] ?? null

  if (existingDetail) {
    await prisma.detailAbsensiSiswa.update({
      where: { id: existingDetail.id },
      data: { status: status_baru, keterangan: keterangan ?? null },
    })
  } else {
    await prisma.detailAbsensiSiswa.create({
      data: {
        absensi_id: absensi.id,
        jadwal_id: null,
        guru_id: walasId,
        status: status_baru,
        keterangan: keterangan ?? null,
        jam_absen: new Date(),
      },
    })
  }

  await prisma.absensiSiswa.update({
    where: { id: absensi.id },
    data: { status_harian: status_baru },
  })

  if (kelas_id) {
    await simpanFinalAbsensi(siswa_id, parseInt(kelas_id, 10), targetDate)
  }
}

function findOrCreateAbsensi() {
  return prisma.absensiSiswa.findFirst({
    where: {},
    include: { detail: true },
  })
}