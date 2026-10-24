const WIB = 'Asia/Jakarta'

export function formatDateTime(date: Date | string | null): string | null {
  if (!date) return null
  return new Date(date).toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: WIB,
  })
}

export function formatDate(date: Date | string | null): string | null {
  if (!date) return null
  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: WIB,
  })
}

export function formatTime(time: Date | string | null): string | null {
  if (!time) return null
  const d = new Date(typeof time === 'string' ? time : time)
  if (Number.isNaN(d.getTime())) {
    return typeof time === 'string' ? time.slice(0, 5) : null
  }
  return d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: WIB,
  })
}

export function formatJam(val: Date | string | null): string | null {
  if (!val) return null
  if (typeof val === 'string') {
    const m = val.match(/^(\d{1,2}):(\d{2})/)
    if (m) return `${m[1].padStart(2, '0')}:${m[2]}`
    return val.slice(0, 5)
  }
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return null
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

export function nowWibTimeString(): string {
  return new Date().toLocaleTimeString('en-GB', { timeZone: WIB, hour12: false }).slice(0, 5)
}

const _todayWIBDateStr = (): string => new Date().toLocaleDateString('en-CA', { timeZone: WIB })

export function wibTodayAt(time: Date | string | number): Date | null {
  let h: number, m: number
  if (typeof time === 'string') {
    const parts = time.split(':').map(Number)
    h = parts[0]
    m = parts[1]
  } else {
    const d = new Date(time)
    h = d.getUTCHours()
    m = d.getUTCMinutes()
  }
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return new Date(`${_todayWIBDateStr()}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000+07:00`)
}

export function getTodayStrWIB(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: WIB })
}

export function toDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`)
}

export function getTodayWIB(): Date {
  return toDateOnly(getTodayStrWIB())
}

export function parseTanggal(tanggalStr: string): Date {
  return toDateOnly(tanggalStr)
}

export function getTanggalRangeWIB(tanggalStr: string): { start: Date; end: Date } {
  const start = new Date(`${tanggalStr}T00:00:00.000+07:00`)
  const end = new Date(`${tanggalStr}T23:59:59.999+07:00`)
  return { start, end }
}

export function getNowWIB(): Date {
  return new Date()
}

export function getWeekNumber(date: Date | string): number {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1)
  return Math.ceil((((d.getTime() - yearStart) / 86400000) + 1) / 7)
}

export function validateTimeFormat(time: string): boolean {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  return timeRegex.test(time)
}