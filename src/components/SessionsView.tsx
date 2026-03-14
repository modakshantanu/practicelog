import { useMemo, useState } from 'react'
import type { PracticeSession, SuggestedValues } from '../types'
import { deleteSessions } from '../storage'
import {
  formatDateTime,
  isoToLocalMinute,
  nowIsoLocalMinute,
  parseLocalDateTime,
} from '../utils/time'
import { buildEmptyDraft } from '../utils/sessionDraft'
import { SessionForm } from './SessionForm'

type SessionsViewProps = {
  sessions: PracticeSession[]
  suggestions: SuggestedValues
  onDeleteSessions: (nextSessions: PracticeSession[]) => void
  onUpdateSession: (session: PracticeSession) => void
  onClearAllData: () => void
}

function sessionToDraft(session: PracticeSession) {
  const localStart = isoToLocalMinute(session.startTime) ?? nowIsoLocalMinute()

  return {
    startTime: localStart,
    totalDurationMinutes: session.totalDurationMinutes,
    notes: session.notes,
    entries: session.entries.map((entry) => ({ ...entry })),
  }
}

export function SessionsView({
  sessions,
  suggestions,
  onDeleteSessions,
  onUpdateSession,
  onClearAllData,
}: SessionsViewProps) {
  const [selectedIdsRaw, setSelectedIdsRaw] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState(buildEmptyDraft)
  const [error, setError] = useState('')

  const validIdSet = useMemo(
    () => new Set(sessions.map((session) => session.id)),
    [sessions],
  )
  const selectedIds = useMemo(
    () => selectedIdsRaw.filter((id) => validIdSet.has(id)),
    [selectedIdsRaw, validIdSet],
  )
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const allSelected = sessions.length > 0 && selectedIds.length === sessions.length
  const hasValidEditingSession =
    editingId != null && sessions.some((session) => session.id === editingId)

  const toggleSelected = (sessionId: string) => {
    setSelectedIdsRaw((current) => {
      const filtered = current.filter((id) => validIdSet.has(id))
      return filtered.includes(sessionId)
        ? filtered.filter((id) => id !== sessionId)
        : [...filtered, sessionId]
    })
  }

  const selectAll = () => {
    if (allSelected) {
      setSelectedIdsRaw([])
      return
    }

    setSelectedIdsRaw(sessions.map((session) => session.id))
  }

  const removeSelected = () => {
    const confirmed = window.confirm(
      `Delete ${selectedIds.length} selected session${selectedIds.length === 1 ? '' : 's'}?`,
    )
    if (!confirmed) {
      return
    }

    const next = deleteSessions(sessions, selectedIds)
    onDeleteSessions(next)
    setSelectedIdsRaw([])
  }

  const deleteOneSession = (sessionId: string) => {
    const confirmed = window.confirm('Delete this session?')
    if (!confirmed) {
      return
    }

    onDeleteSessions(deleteSessions(sessions, [sessionId]))
  }

  const beginEdit = (session: PracticeSession) => {
    setError('')
    setEditingId(session.id)
    setEditDraft(sessionToDraft(session))
  }

  const saveEdit = () => {
    setError('')

    const current = sessions.find((session) => session.id === editingId)
    if (!current) {
      return
    }

    const cleanedEntries = editDraft.entries
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

    const parsedStart = parseLocalDateTime(editDraft.startTime)
    if (!parsedStart) {
      setError('Enter a valid start time.')
      return
    }

    onUpdateSession({
      ...current,
      startTime: parsedStart,
      totalDurationMinutes: Math.max(1, Math.round(editDraft.totalDurationMinutes)),
      notes: editDraft.notes.trim(),
      entries: cleanedEntries,
      updatedAt: new Date().toISOString(),
    })

    setEditingId(null)
    setEditDraft({
      ...buildEmptyDraft(),
      startTime: nowIsoLocalMinute(),
    })
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Past Sessions</h2>
        <div className="actions">
          <button
            className="btn ghost"
            type="button"
            onClick={selectAll}
            disabled={!sessions.length}
          >
            {allSelected ? 'Clear selection' : 'Select all'}
          </button>
          <button
            className="btn danger"
            type="button"
            onClick={removeSelected}
            disabled={!selectedIds.length}
          >
            Delete selected ({selectedIds.length})
          </button>
          <button
            className="btn danger"
            type="button"
            onClick={onClearAllData}
            disabled={!sessions.length}
          >
            Clear data
          </button>
        </div>
      </div>

      {!sessions.length && <p className="muted">No sessions.</p>}

      <div className="session-list">
        {sessions.map((session) => (
          <article key={session.id} className="session-card">
            <div className="session-top">
              <label className="checkbox">
                <input
                  type="checkbox"
                  aria-label="Select session"
                  checked={selectedSet.has(session.id)}
                  onChange={() => toggleSelected(session.id)}
                />
              </label>
              <strong>{formatDateTime(session.startTime)}</strong>
              <span>{session.totalDurationMinutes} min</span>
            </div>

            <ul className="entry-summary">
              {session.entries.map((entry) => (
                <li key={entry.id}>
                  <span>{entry.piece}</span>
                  {entry.focusArea && <span className="muted"> - {entry.focusArea}</span>}
                  {entry.durationMinutes != null && (
                    <span className="muted"> ({entry.durationMinutes}m)</span>
                  )}
                </li>
              ))}
            </ul>

            {session.notes && <p className="muted">{session.notes}</p>}

            <div className="actions">
              <button className="btn ghost" type="button" onClick={() => beginEdit(session)}>
                Edit
              </button>
              <button
                className="btn danger"
                type="button"
                onClick={() => deleteOneSession(session.id)}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>

      {editingId && hasValidEditingSession && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Edit session</h3>
            {error && <p className="muted">{error}</p>}
            <SessionForm
              draft={editDraft}
              suggestions={suggestions}
              submitLabel="Save changes"
              onChange={setEditDraft}
              onSubmit={saveEdit}
              onCancel={() => {
                setEditingId(null)
                setError('')
              }}
            />
          </div>
        </div>
      )}
    </section>
  )
}
