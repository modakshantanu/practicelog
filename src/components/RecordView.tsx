import { useEffect, useMemo, useRef, useState } from 'react'
import {
  clearRecordDraftState,
  loadRecordDraftState,
  saveRecordDraftState,
} from '../storage'
import type { PracticeSession, SuggestedValues } from '../types'
import { buildEmptyDraft } from '../utils/sessionDraft'
import { elapsedSeconds, nowIsoLocalMinute, parseLocalDateTime } from '../utils/time'
import { SessionForm } from './SessionForm'

const NOTIF_TAG = 'practice-timer'

async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

async function showTimerNotification(minutes: number) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const reg = await navigator.serviceWorker?.ready
  if (!reg) return
  await reg.showNotification('Practice Log', {
    body: `Session running — ${minutes} min`,
    tag: NOTIF_TAG,
    silent: true,
    requireInteraction: true,
  })
}

async function closeTimerNotification() {
  const reg = await navigator.serviceWorker?.ready
  if (!reg) return
  const notifications = await reg.getNotifications({ tag: NOTIF_TAG })
  notifications.forEach(n => n.close())
}

type RecordViewProps = {
  suggestions: SuggestedValues
  onSaveSession: (session: PracticeSession) => void
}

type RecordViewInitialState = {
  draft: ReturnType<typeof buildEmptyDraft>
  accumulatedSeconds: number
  runStartedMs: number | null
  tickMs: number
}

function buildInitialRecordState(): RecordViewInitialState {
  const persisted = loadRecordDraftState()
  const fallback = buildEmptyDraft()

  if (!persisted) {
    return {
      draft: fallback,
      accumulatedSeconds: 0,
      runStartedMs: null,
      tickMs: 0,
    }
  }

  const draft = {
    ...fallback,
    ...persisted.draft,
    entries: persisted.draft.entries.length ? persisted.draft.entries : fallback.entries,
  }

  return {
    draft,
    accumulatedSeconds: persisted.accumulatedSeconds,
    runStartedMs: persisted.runStartedMs,
    tickMs: persisted.runStartedMs ? Date.now() : 0,
  }
}

export function RecordView({ suggestions, onSaveSession }: RecordViewProps) {
  const [initialState] = useState(buildInitialRecordState)
  const [draft, setDraft] = useState(initialState.draft)
  const [runStartedMs, setRunStartedMs] = useState<number | null>(initialState.runStartedMs)
  const [accumulatedSeconds, setAccumulatedSeconds] = useState(initialState.accumulatedSeconds)
  const [tickMs, setTickMs] = useState(initialState.tickMs)
  const [error, setError] = useState('')
  const lastNotifMinute = useRef(-1)

  useEffect(() => {
    saveRecordDraftState({ draft, accumulatedSeconds, runStartedMs })
  }, [draft, accumulatedSeconds, runStartedMs])

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

      const currentMinute = Math.floor(totalSeconds / 60)
      if (currentMinute !== lastNotifMinute.current) {
        lastNotifMinute.current = currentMinute
        showTimerNotification(currentMinute)
      }
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
    clearRecordDraftState()
    setDraft(buildEmptyDraft())
    setRunStartedMs(null)
    setAccumulatedSeconds(0)
    setTickMs(0)
    lastNotifMinute.current = -1
    closeTimerNotification()
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
      lastNotifMinute.current = -1
      closeTimerNotification()
      return
    }

    const start = Date.now()

    if (accumulatedSeconds === 0) {
      setDraft((current) => ({
        ...current,
        startTime: nowIsoLocalMinute(),
      }))
    }

    // Timer state is the source of truth; starting does not read manual duration.
    setDraft((current) => ({
      ...current,
      totalDurationMinutes: Math.floor(accumulatedSeconds / 60),
    }))
    setRunStartedMs(start)
    setTickMs(start)
    setError('')

    requestNotificationPermission().then(granted => {
      if (granted) {
        const mins = Math.floor(accumulatedSeconds / 60)
        lastNotifMinute.current = mins
        showTimerNotification(mins)
      }
    })
  }

  const resetRealtime = () => {
    setDraft((current) => ({
      ...current,
      totalDurationMinutes: 0,
    }))
    setAccumulatedSeconds(0)
    setTickMs(0)
    setRunStartedMs(null)
    lastNotifMinute.current = -1
    closeTimerNotification()
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
            disabled={!runStartedMs && accumulatedSeconds === 0}
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
