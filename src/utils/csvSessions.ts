import type { PracticeEntry, PracticeSession } from '../types'

const SCHEMA_VERSION = 'v1'

const CSV_HEADERS = [
  'schema_version',
  'session_id',
  'session_start_time_iso',
  'session_total_duration_minutes',
  'session_notes',
  'session_created_at_iso',
  'session_updated_at_iso',
  'entry_id',
  'entry_index',
  'entry_piece',
  'entry_focus_area',
  'entry_duration_minutes',
] as const

type CsvHeader = (typeof CSV_HEADERS)[number]

type ImportResult = {
  sessions: PracticeSession[]
  rowCount: number
}

type SessionAccumulator = {
  session: Omit<PracticeSession, 'entries'>
  entries: Array<{ entry: PracticeEntry; index: number }>
}

function escapeCsvValue(value: string): string {
  const next = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const escaped = next.replace(/"/g, '""')
  if (/[,"\n]/.test(escaped)) {
    return `"${escaped}"`
  }
  return escaped
}

function rowToCsv(values: string[]): string {
  return values.map((value) => escapeCsvValue(value)).join(',')
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]

    if (inQuotes) {
      if (char === '"') {
        const next = text[index + 1]
        if (next === '"') {
          cell += '"'
          index += 1
        } else {
          inQuotes = false
        }
      } else {
        cell += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
      continue
    }

    if (char === ',') {
      row.push(cell)
      cell = ''
      continue
    }

    if (char === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      continue
    }

    if (char === '\r') {
      continue
    }

    cell += char
  }

  row.push(cell)
  rows.push(row)

  return rows.filter((nextRow) => {
    return !(nextRow.length === 1 && nextRow[0].trim() === '')
  })
}

function toIso(value: string, fallback: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return fallback
  }
  return parsed.toISOString()
}

function toMinNumber(value: string, fallback: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return fallback
  }
  return Math.max(1, Math.round(parsed))
}

function toEntryDuration(value: string): number | null {
  if (!value.trim()) {
    return null
  }

  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return null
  }

  return Math.max(0, Math.round(parsed))
}

function toEntryIndex(value: string): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return 0
  }
  return Math.max(0, Math.round(parsed))
}

export function exportSessionsToCsv(sessions: PracticeSession[]): string {
  const rows: string[] = [rowToCsv([...CSV_HEADERS])]

  sessions.forEach((session) => {
    session.entries.forEach((entry, index) => {
      rows.push(
        rowToCsv([
          SCHEMA_VERSION,
          session.id,
          session.startTime,
          String(session.totalDurationMinutes),
          session.notes,
          session.createdAt,
          session.updatedAt,
          entry.id,
          String(index),
          entry.piece,
          entry.focusArea,
          entry.durationMinutes == null ? '' : String(entry.durationMinutes),
        ]),
      )
    })
  })

  return `${rows.join('\n')}\n`
}

export function importSessionsFromCsv(text: string): ImportResult {
  const rows = parseCsv(text)
  if (!rows.length) {
    throw new Error('CSV is empty.')
  }

  const header = rows[0]
  if (header.length !== CSV_HEADERS.length) {
    throw new Error('Invalid CSV header shape.')
  }

  const headerMatches = CSV_HEADERS.every((value, index) => header[index] === value)
  if (!headerMatches) {
    throw new Error('Invalid CSV header names.')
  }

  if (rows.length < 2) {
    throw new Error('CSV has no data rows.')
  }

  const grouped = new Map<string, SessionAccumulator>()
  let parsedRows = 0

  rows.slice(1).forEach((values, rowIndex) => {
    if (values.length !== CSV_HEADERS.length) {
      throw new Error(`Row ${rowIndex + 2}: expected ${CSV_HEADERS.length} columns.`)
    }

    const record = Object.fromEntries(
      CSV_HEADERS.map((headerName: CsvHeader, index) => [headerName, values[index]]),
    ) as Record<CsvHeader, string>

    if (record.schema_version !== SCHEMA_VERSION) {
      throw new Error(`Row ${rowIndex + 2}: unsupported schema version.`)
    }

    const sessionId = record.session_id.trim()
    const entryId = record.entry_id.trim() || crypto.randomUUID()
    const piece = record.entry_piece.trim()

    if (!sessionId) {
      throw new Error(`Row ${rowIndex + 2}: session_id is required.`)
    }

    if (!piece) {
      throw new Error(`Row ${rowIndex + 2}: entry_piece is required.`)
    }

    const nowIso = new Date().toISOString()
    const startTime = toIso(record.session_start_time_iso, nowIso)
    const createdAt = toIso(record.session_created_at_iso, nowIso)
    const updatedAt = toIso(record.session_updated_at_iso, nowIso)

    const current =
      grouped.get(sessionId) ?? {
        session: {
          id: sessionId,
          startTime,
          totalDurationMinutes: toMinNumber(record.session_total_duration_minutes, 1),
          notes: record.session_notes,
          createdAt,
          updatedAt,
        },
        entries: [],
      }

    current.entries.push({
      index: toEntryIndex(record.entry_index),
      entry: {
        id: entryId,
        piece,
        focusArea: record.entry_focus_area.trim(),
        durationMinutes: toEntryDuration(record.entry_duration_minutes),
      },
    })

    grouped.set(sessionId, current)
    parsedRows += 1
  })

  const sessions = [...grouped.values()]
    .map(({ session, entries }) => {
      const nextEntries = entries
        .sort((a, b) => a.index - b.index)
        .map((value) => value.entry)

      return {
        ...session,
        entries: nextEntries,
      }
    })
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())

  return {
    sessions,
    rowCount: parsedRows,
  }
}
