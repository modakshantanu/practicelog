export function formatDateTime(isoDate: string): string {
  const value = new Date(isoDate)
  if (Number.isNaN(value.getTime())) {
    return 'Invalid date'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value)
}

export function nowIsoLocalMinute(): string {
  const now = new Date()
  const timezoneOffset = now.getTimezoneOffset() * 60_000
  const local = new Date(now.getTime() - timezoneOffset)
  return local.toISOString().slice(0, 16)
}

export function parseLocalDateTime(value: string): string | null {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.toISOString()
}

export function isoToLocalMinute(value: string): string | null {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  const timezoneOffset = parsed.getTimezoneOffset() * 60_000
  return new Date(parsed.getTime() - timezoneOffset).toISOString().slice(0, 16)
}

export function formatMinutes(totalMinutes: number): string {
  const safe = Math.max(0, Math.round(totalMinutes))
  const hours = Math.floor(safe / 60)
  const minutes = safe % 60

  if (!hours) {
    return `${minutes}m`
  }

  if (!minutes) {
    return `${hours}h`
  }

  return `${hours}h ${minutes}m`
}

export function elapsedMinutes(startedAtMs: number): number {
  const elapsed = Date.now() - startedAtMs
  return Math.max(0, Math.floor(elapsed / 60_000))
}
