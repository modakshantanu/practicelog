import { useEffect, useMemo, useState } from 'react'
import type { PracticeSession, SuggestedValues } from '../types'
import { buildEmptyDraft } from '../utils/sessionDraft'
import { elapsedSeconds, nowIsoLocalMinute, parseLocalDateTime } from '../utils/time'
import { SessionForm } from './SessionForm'

type RecordViewProps = {
  suggestions: SuggestedValues
  onSaveSession: (session: PracticeSession) => void
}

export function RecordView({ suggestions, onSaveSession }: RecordViewProps) {
  const [draft, setDraft] = useState(buildEmptyDraft)
  const [runStartedMs, setRunStartedMs] = useState<number | null>(null)
  const [accumulatedSeconds, setAccumulatedSeconds] = useState(0)
  const [tickMs, setTickMs] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!runStartedMs) {
      return
    }

    const timer = setInterval(() => {
      const nowMs = Date.now()
      const totalSeconds = accumulatedSeconds + elapsedSeconds(runStartedMs)
      setTickMs(nowMs)
      setDraft((current) => ({
        ...current,
        totalDurationMinutes: Math.floor(totalSeconds / 60),
      }))
    }, 1000)

    return () => clearInterval(timer)
  }, [accumulatedSeconds, runStartedMs])

  const liveSeconds = useMemo(() => {
    if (!runStartedMs) {
      return accumulatedSeconds
    }

    const elapsed = Math.max(0, Math.floor((tickMs - runStartedMs) / 1000))
    return accumulatedSeconds + elapsed
  }, [accumulatedSeconds, runStartedMs, tickMs])

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
    setRunStartedMs(null)
    setAccumulatedSeconds(0)
    setTickMs(0)
  }

  const startOrPauseRealtime = () => {
    if (runStartedMs) {
      const elapsedSinceStart = elapsedSeconds(runStartedMs)
      const nextAccumulated = accumulatedSeconds + elapsedSinceStart
      setAccumulatedSeconds(nextAccumulated)
      setDraft((current) => ({
        ...current,
        totalDurationMinutes: Math.floor(nextAccumulated / 60),
      }))
      setRunStartedMs(null)
      return
    }

    const baseSeconds = Math.max(0, Math.round(draft.totalDurationMinutes * 60))
    const start = Date.now()

    if (baseSeconds === 0) {
      setDraft((current) => ({
        ...current,
        startTime: nowIsoLocalMinute(),
      }))
    }

    setAccumulatedSeconds(baseSeconds)
    setRunStartedMs(start)
    setTickMs(start)
    setError('')
  }

  const resetRealtime = () => {
    setDraft((current) => ({
      ...current,
      totalDurationMinutes: 0,
    }))
    setAccumulatedSeconds(0)
    setTickMs(0)
    setRunStartedMs(null)
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
          <button
            className="btn primary"
            type="button"
            onClick={startOrPauseRealtime}
          >
            {runStartedMs ? 'Pause' : 'Start'}
          </button>
          <button
            className="btn danger"
            type="button"
            disabled={!runStartedMs && accumulatedSeconds === 0 && draft.totalDurationMinutes === 0}
            onClick={resetRealtime}
          >
            Reset
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
