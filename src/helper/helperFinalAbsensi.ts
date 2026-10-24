import { StatusAbsensi } from '@prisma/client'

type Counts = Record<StatusAbsensi, number>

const PRIORITAS: StatusAbsensi[] = ['Alpha', 'Sakit', 'Izin', 'Hadir']

export function hitungStatusFinal(counts: Counts): StatusAbsensi {
  const maxVal = Math.max(...Object.values(counts))
  return PRIORITAS.find((s) => counts[s] === maxVal)!
}

export function hitungStatistikFinal(records: { status_final: StatusAbsensi }[]) {
  const total = records.length
  const Hadir = records.filter((r) => r.status_final === 'Hadir').length
  const Izin = records.filter((r) => r.status_final === 'Izin').length
  const Sakit = records.filter((r) => r.status_final === 'Sakit').length
  const Alpha = records.filter((r) => r.status_final === 'Alpha').length
  return {
    total_hari: total,
    Hadir, Izin, Sakit, Alpha,
    persentase_kehadiran: total > 0 ? ((Hadir / total) * 100).toFixed(2) : '0.00',
  }
}
