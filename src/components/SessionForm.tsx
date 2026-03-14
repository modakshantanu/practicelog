import type { FormEvent } from 'react'
import type { PracticeEntry, SessionDraft, SuggestedValues } from '../types'
import { createDraftEntry } from '../utils/sessionDraft'

type SessionFormProps = {
  draft: SessionDraft
  suggestions: SuggestedValues
  submitLabel: string
  onChange: (next: SessionDraft) => void
  onSubmit: () => void
  onCancel?: () => void
}

function toNumberOrNull(value: string): number | null {
  if (!value.trim()) {
    return null
  }

  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null
  }

  return Math.round(parsed)
}

function toSafeMinNumber(value: string, min: number, fallback: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return Math.max(min, Math.round(parsed))
}

export function SessionForm({
  draft,
  suggestions,
  submitLabel,
  onChange,
  onSubmit,
  onCancel,
}: SessionFormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit()
  }

  const updateEntry = (
    entryId: string,
    key: keyof PracticeEntry,
    value: string | number | null,
  ) => {
    const nextEntries = draft.entries.map((entry) => {
      if (entry.id !== entryId) {
        return entry
      }
      return {
        ...entry,
        [key]: value,
      }
    })

    onChange({
      ...draft,
      entries: nextEntries,
    })
  }

  const removeEntry = (entryId: string) => {
    const filtered = draft.entries.filter((entry) => entry.id !== entryId)
    onChange({
      ...draft,
      entries: filtered.length ? filtered : [createDraftEntry()],
    })
  }

  return (
    <form className="session-form" onSubmit={handleSubmit}>
      <div className="inline-fields">
        <label className="inline-field-row">
          <span>Start time:</span>
          <input
            required
            type="datetime-local"
            value={draft.startTime}
            onChange={(event) =>
              onChange({
                ...draft,
                startTime: event.target.value,
              })
            }
          />
        </label>

        <label className="inline-field-row">
          <span>Duration (mins):</span>
          <input
            required
            min={0}
            type="number"
            value={draft.totalDurationMinutes}
            onChange={(event) =>
              onChange({
                ...draft,
                totalDurationMinutes: toSafeMinNumber(
                  event.target.value,
                  0,
                  draft.totalDurationMinutes,
                ),
              })
            }
          />
        </label>
      </div>

      <label className="field">
        <span>Notes</span>
        <textarea
          rows={3}
          value={draft.notes}
          onChange={(event) =>
            onChange({
              ...draft,
              notes: event.target.value,
            })
          }
        />
      </label>

      <div className="entry-head">
        <h3>Pieces</h3>
        <button
          type="button"
          className="btn ghost"
          onClick={() =>
            onChange({
              ...draft,
              entries: [createDraftEntry(), ...draft.entries],
            })
          }
        >
          Add row
        </button>
      </div>

      {suggestions.recentPieces.length > 0 && (
        <div className="chips">
          {suggestions.recentPieces.map((piece) => (
            <button
              key={piece}
              className="chip"
              type="button"
              onClick={() => {
                const nextEntries = [...draft.entries]
                nextEntries[0] = {
                  ...nextEntries[0],
                  piece,
                }
                onChange({ ...draft, entries: nextEntries })
              }}
            >
              {piece}
            </button>
          ))}
        </div>
      )}

      <div className="entry-list">
        {draft.entries.map((entry) => (
          <div className="entry-row" key={entry.id}>
            <div className="field">
              <input
                aria-label="Piece"
                list="piece-suggestions"
                value={entry.piece}
                onChange={(event) =>
                  updateEntry(entry.id, 'piece', event.target.value)
                }
                placeholder="Piece"
              />
            </div>

            <div className="field">
              <input
                aria-label="Focus area"
                list="focus-suggestions"
                value={entry.focusArea}
                onChange={(event) =>
                  updateEntry(entry.id, 'focusArea', event.target.value)
                }
                placeholder="Focus area (optional)"
              />
            </div>

            <div className="field">
              <input
                aria-label="Time in minutes"
                min={0}
                type="number"
                value={entry.durationMinutes ?? ''}
                onChange={(event) =>
                  updateEntry(
                    entry.id,
                    'durationMinutes',
                    toNumberOrNull(event.target.value),
                  )
                }
                placeholder="Time (optional)"
              />
            </div>

            <button
              type="button"
              className="btn danger"
              onClick={() => removeEntry(entry.id)}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="suggestions-wrap">
        <datalist id="piece-suggestions">
          {suggestions.pieces.map((piece) => (
            <option key={piece} value={piece} />
          ))}
        </datalist>

        <datalist id="focus-suggestions">
          {suggestions.focusAreas.map((focusArea) => (
            <option key={focusArea} value={focusArea} />
          ))}
        </datalist>
      </div>

      <div className="actions">
        <button type="submit" className="btn primary">
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
