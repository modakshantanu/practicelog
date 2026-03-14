import type { PracticeSession, SuggestedValues } from './types'

const STORAGE_KEY = 'piano_practice_sessions_v1'

function toSafeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return fallback
  }
  return parsed
}

function toIso(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return fallback
  }

  return parsed.toISOString()
}

function sanitizeSession(input: unknown): PracticeSession | null {
  if (!input || typeof input !== 'object') {
    return null
  }

  const candidate = input as Partial<PracticeSession>
  const now = new Date().toISOString()

  const entries = Array.isArray(candidate.entries)
    ? candidate.entries
        .map((entry) => {
          if (!entry || typeof entry !== 'object') {
            return null
          }

          const next = entry as {
            id?: unknown
            piece?: unknown
            focusArea?: unknown
            durationMinutes?: unknown
          }

          const piece = typeof next.piece === 'string' ? next.piece.trim() : ''
          if (!piece) {
            return null
          }

          const focusArea =
            typeof next.focusArea === 'string' ? next.focusArea.trim() : ''
          const durationMinutes =
            next.durationMinutes == null
              ? null
              : Math.max(0, Math.round(toSafeNumber(next.durationMinutes, 0)))

          return {
            id:
              typeof next.id === 'string' && next.id.trim()
                ? next.id
                : crypto.randomUUID(),
            piece,
            focusArea,
            durationMinutes,
          }
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    : []

  if (!entries.length) {
    return null
  }

  const id =
    typeof candidate.id === 'string' && candidate.id.trim()
      ? candidate.id
      : crypto.randomUUID()

  return {
    id,
    startTime: toIso(candidate.startTime, now),
    totalDurationMinutes: Math.max(
      1,
      Math.round(toSafeNumber(candidate.totalDurationMinutes, 1)),
    ),
    notes: typeof candidate.notes === 'string' ? candidate.notes : '',
    entries,
    createdAt: toIso(candidate.createdAt, now),
    updatedAt: toIso(candidate.updatedAt, now),
  }
}

export function sanitizeSessions(input: unknown): PracticeSession[] {
  if (!Array.isArray(input)) {
    return []
  }

  return sortSessions(
    input
      .map((session) => sanitizeSession(session))
      .filter((session): session is PracticeSession => session !== null),
  )
}

function sortSessions(sessions: PracticeSession[]): PracticeSession[] {
  return [...sessions].sort((a, b) => {
    return new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  })
}

export function loadSessions(): PracticeSession[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    return sanitizeSessions(parsed)
  } catch {
    return []
  }
}

export function saveSessions(sessions: PracticeSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sortSessions(sessions)))
  } catch {
    // Ignore storage write failures (e.g., quota exceeded).
  }
}

export function upsertSession(
  sessions: PracticeSession[],
  nextSession: PracticeSession,
): PracticeSession[] {
  const index = sessions.findIndex((session) => session.id === nextSession.id)
  if (index < 0) {
    return sortSessions([nextSession, ...sessions])
  }

  const copy = [...sessions]
  copy[index] = nextSession
  return sortSessions(copy)
}

export function deleteSessions(
  sessions: PracticeSession[],
  idsToDelete: string[],
): PracticeSession[] {
  if (!idsToDelete.length) {
    return sessions
  }

  const idSet = new Set(idsToDelete)
  return sessions.filter((session) => !idSet.has(session.id))
}

export function getSuggestions(sessions: PracticeSession[]): SuggestedValues {
  const pieces = new Set<string>()
  const recentPieces: string[] = []
  const recentPieceSet = new Set<string>()
  const focusAreas = new Set<string>()

  sessions.forEach((session) => {
    session.entries.forEach((entry) => {
      const normalizedPiece = entry.piece.trim()
      const normalizedFocus = entry.focusArea.trim()
      if (normalizedPiece) {
        pieces.add(normalizedPiece)
        if (!recentPieceSet.has(normalizedPiece) && recentPieces.length < 5) {
          recentPieceSet.add(normalizedPiece)
          recentPieces.push(normalizedPiece)
        }
      }
      if (normalizedFocus) {
        focusAreas.add(normalizedFocus)
      }
    })
  })

  return {
    pieces: [...pieces].sort((a, b) => a.localeCompare(b)),
    recentPieces,
    focusAreas: [...focusAreas].sort((a, b) => a.localeCompare(b)),
  }
}
