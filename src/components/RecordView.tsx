import { useEffect, useMemo, useState } from 'react'
import type { PracticeSession, SuggestedValues } from '../types'
import { buildEmptyDraft } from '../utils/sessionDraft'
import {
  elapsedMinutes,
  elapsedSeconds,
  nowIsoLocalMinute,
  parseLocalDateTime,
} from '../utils/time'
import { SessionForm } from './SessionForm'

type RecordViewProps = {
  suggestions: SuggestedValues
  onSaveSession: (session: PracticeSession) => void
}

export function RecordView({ suggestions, onSaveSession }: RecordViewProps) {
  const [draft, setDraft] = useState(buildEmptyDraft)
  const [liveStartMs, setLiveStartMs] = useState<number | null>(null)
  const [liveSeconds, setLiveSeconds] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!liveStartMs) {
      return
    }

    const timer = setInterval(() => {
      setLiveSeconds(elapsedSeconds(liveStartMs))
    }, 1000)

    return () => clearInterval(timer)
  }, [liveStartMs])

  const liveLabel = useMemo(() => {
    const hours = Math.floor(liveSeconds / 3600)
    const minutes = Math.floor((liveSeconds % 3600) / 60)
    const seconds = liveSeconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }, [liveSeconds])

  const saveFromDraft = () => {
    setError('')

    const cleanedEntries = draft.entries
      .map((entry) => ({
        ...entry,
        piece: entry.piece.trim(),
        focusArea: entry.focusArea.trim(),
      }))
      .filter((entry) => entry.piece)

    if (!cleanedEntries.length) {
      setError('Add at least one piece before saving.')
      return
    }

    const parsedStart = parseLocalDateTime(draft.startTime)
    if (!parsedStart) {
      setError('Enter a valid start time.')
      return
    }

    const now = new Date().toISOString()
    const session: PracticeSession = {
      id: crypto.randomUUID(),
      startTime: parsedStart,
      totalDurationMinutes: Math.max(1, Math.round(draft.totalDurationMinutes)),
      notes: draft.notes.trim(),
      entries: cleanedEntries,
      createdAt: now,
      updatedAt: now,
    }

    onSaveSession(session)
    setDraft(buildEmptyDraft())
    setLiveStartMs(null)
    setLiveSeconds(0)
  }

  const startRealtime = () => {
    const start = Date.now()
    setLiveStartMs(start)
    setLiveSeconds(0)
    setError('')
    setDraft((current) => ({
      ...current,
      startTime: nowIsoLocalMinute(),
      totalDurationMinutes: 0,
    }))
  }

  const stopRealtime = () => {
    if (!liveStartMs) {
      return
    }

    const elapsed = Math.max(1, elapsedMinutes(liveStartMs))
    setDraft((current) => ({
      ...current,
      totalDurationMinutes: elapsed,
    }))
    setLiveStartMs(null)
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Record Practice</h2>
      </div>

      <div className="live-card">
        <div>
          <div className="kicker">Timer</div>
          <div className="live-time">{liveLabel}</div>
        </div>
        <div className="actions">
          {!liveStartMs && (
            <button className="btn primary" type="button" onClick={startRealtime}>
              Start
            </button>
          )}
          {liveStartMs && (
            <button className="btn danger" type="button" onClick={stopRealtime}>
              Stop timer
            </button>
          )}
          <button
            className="btn ghost"
            type="button"
            disabled={!liveStartMs}
            onClick={() =>
              setDraft((current) => ({
                ...current,
                totalDurationMinutes: liveStartMs
                  ? Math.max(1, elapsedMinutes(liveStartMs))
                  : current.totalDurationMinutes,
              }))
            }
          >
            Sync
          </button>
        </div>
      </div>

      {error && <p className="muted">{error}</p>}

      <SessionForm
        draft={draft}
        suggestions={suggestions}
        submitLabel="Save session"
        onChange={setDraft}
        onSubmit={saveFromDraft}
      />
    </section>
  )
}
