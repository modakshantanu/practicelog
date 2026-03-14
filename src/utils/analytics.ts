import type { Horizon, PracticeEntry, PracticeSession } from '../types'

export type HorizonConfig = {
  label: string
  days: number | null
}

export const HORIZONS: Record<Horizon, HorizonConfig> = {
  '1d': { label: 'Past day', days: 1 },
  '7d': { label: 'Past 7 days', days: 7 },
  '30d': { label: 'Past 30 days', days: 30 },
  '90d': { label: 'Past 90 days', days: 90 },
  all: { label: 'All time', days: null },
  custom: { label: 'Custom', days: null },
}

export function isHorizon(value: string): value is Horizon {
  return value in HORIZONS
}

type EntryDuration = {
  entry: PracticeEntry
  minutes: number
}

export type AnalyticsSummary = {
  totalMinutes: number
  sessionCount: number
  avgMinutesPerSession: number
  minutesPerDay: number
}

export type FocusBreakdown = {
  focusArea: string
  minutes: number
}

export type PieceBreakdown = {
  piece: string
  minutes: number
  focusBreakdown: FocusBreakdown[]
}

export type AnalyticsResult = {
  sessions: PracticeSession[]
  summary: AnalyticsSummary
  byPiece: PieceBreakdown[]
}

function toLocalDayKey(isoDate: string): string {
  const value = new Date(isoDate)
  if (Number.isNaN(value.getTime())) {
    return 'invalid'
  }

  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getEntryDurations(session: PracticeSession): EntryDuration[] {
  const normalizedEntries = session.entries.length
    ? session.entries
    : [
        {
          id: `uncategorized-${session.id}`,
          piece: 'Uncategorized',
          focusArea: '',
          durationMinutes: null,
        },
      ]

  const explicitTotal = normalizedEntries.reduce((sum, entry) => {
    return sum + Math.max(0, entry.durationMinutes ?? 0)
  }, 0)

  const targetTotal = Math.max(session.totalDurationMinutes, explicitTotal)
  const entriesWithoutDuration = normalizedEntries.filter(
    (entry) => entry.durationMinutes == null,
  )
  const remaining = Math.max(0, targetTotal - explicitTotal)
  const distributed = entriesWithoutDuration.length
    ? remaining / entriesWithoutDuration.length
    : 0

  return normalizedEntries.map((entry) => {
    const minutes = entry.durationMinutes == null ? distributed : entry.durationMinutes
    return {
      entry,
      minutes: Math.max(0, minutes),
    }
  })
}

export function filterByDays(
  sessions: PracticeSession[],
  days: number | null,
): PracticeSession[] {
  if (!days) {
    return sessions
  }

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return sessions.filter((session) => new Date(session.startTime).getTime() >= cutoff)
}

export function computeAnalytics(sessions: PracticeSession[]): AnalyticsResult {
  const totalMinutes = sessions.reduce(
    (sum, session) => sum + Math.max(0, session.totalDurationMinutes),
    0,
  )

  const sessionCount = sessions.length
  const avgMinutesPerSession = sessionCount ? totalMinutes / sessionCount : 0

  const uniqueDays = new Set(
    sessions.map((session) => toLocalDayKey(session.startTime)),
  )
  uniqueDays.delete('invalid')
  const minutesPerDay = uniqueDays.size ? totalMinutes / uniqueDays.size : 0

  const byPieceMap = new Map<string, { minutes: number; focus: Map<string, number> }>()

  sessions.forEach((session) => {
    getEntryDurations(session).forEach(({ entry, minutes }) => {
      const pieceName = entry.piece.trim() || 'Uncategorized'
      const focusName = entry.focusArea.trim() || 'General'
      const currentPiece = byPieceMap.get(pieceName) ?? {
        minutes: 0,
        focus: new Map<string, number>(),
      }

      currentPiece.minutes += minutes
      currentPiece.focus.set(
        focusName,
        (currentPiece.focus.get(focusName) ?? 0) + minutes,
      )
      byPieceMap.set(pieceName, currentPiece)
    })
  })

  const byPiece = [...byPieceMap.entries()]
    .map(([piece, value]) => {
      const focusBreakdown = [...value.focus.entries()]
        .map(([focusArea, minutes]) => ({ focusArea, minutes }))
        .sort((a, b) => b.minutes - a.minutes)

      return {
        piece,
        minutes: value.minutes,
        focusBreakdown,
      }
    })
    .sort((a, b) => b.minutes - a.minutes)

  return {
    sessions,
    summary: {
      totalMinutes,
      sessionCount,
      avgMinutesPerSession,
      minutesPerDay,
    },
    byPiece,
  }
}
