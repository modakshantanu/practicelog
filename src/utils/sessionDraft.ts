import type { PracticeEntry, SessionDraft } from '../types'
import { nowIsoLocalMinute } from './time'

export function createDraftEntry(): PracticeEntry {
  return {
    id: crypto.randomUUID(),
    piece: '',
    focusArea: '',
    durationMinutes: null,
  }
}

export function buildEmptyDraft(): SessionDraft {
  return {
    startTime: nowIsoLocalMinute(),
    totalDurationMinutes: 0,
    notes: '',
    entries: [createDraftEntry()],
  }
}
