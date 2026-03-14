export type PracticeEntry = {
  id: string
  piece: string
  focusArea: string
  durationMinutes: number | null
}

export type PracticeSession = {
  id: string
  startTime: string
  totalDurationMinutes: number
  notes: string
  entries: PracticeEntry[]
  createdAt: string
  updatedAt: string
}

export type SuggestedValues = {
  pieces: string[]
  focusAreas: string[]
}

export type Horizon = '1d' | '7d' | '30d' | '90d' | 'all' | 'custom'

export type SessionDraft = {
  startTime: string
  totalDurationMinutes: number
  notes: string
  entries: PracticeEntry[]
}
