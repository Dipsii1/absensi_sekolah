export const VALID_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const

const WIB = 'Asia/Jakarta'
const wibWeekday = new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: WIB })

export function validateHari(hari: string | null | undefined): boolean {
  if (!hari) return false
  const normalized = hari.charAt(0).toUpperCase() + hari.slice(1).toLowerCase()
  return VALID_HARI.includes(normalized as (typeof VALID_HARI)[number])
}

export function getHariFromDate(date: Date | string | null): string | null {
  if (!date) return null
  return wibWeekday.format(new Date(date))
}
