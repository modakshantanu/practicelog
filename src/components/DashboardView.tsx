import { useMemo, useState } from 'react'
import type { Horizon, PracticeSession } from '../types'
import {
  computeAnalytics,
  filterByDays,
  HORIZONS,
  isHorizon,
} from '../utils/analytics'
import { formatMinutes } from '../utils/time'

type DashboardViewProps = {
  sessions: PracticeSession[]
}

export function DashboardView({ sessions }: DashboardViewProps) {
  const [horizon, setHorizon] = useState<Horizon>('7d')
  const [customDays, setCustomDays] = useState(14)
  const horizonOptions = useMemo(() => Object.keys(HORIZONS) as Horizon[], [])

  const scopedSessions = useMemo(() => {
    const config = HORIZONS[horizon]
    if (horizon === 'custom') {
      return filterByDays(sessions, Math.max(1, customDays))
    }
    return filterByDays(sessions, config.days)
  }, [customDays, horizon, sessions])

  const analytics = useMemo(() => computeAnalytics(scopedSessions), [scopedSessions])

  const handleHorizonChange = (value: string) => {
    if (isHorizon(value)) {
      setHorizon(value)
    }
  }

  const handleCustomDaysChange = (value: string) => {
    const parsed = Number.parseInt(value, 10)
    setCustomDays(Number.isFinite(parsed) && parsed > 0 ? parsed : 1)
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Analytics</h2>
        <div className="horizon-picker">
          <select
            value={horizon}
            onChange={(event) => handleHorizonChange(event.target.value)}
          >
            {horizonOptions.map((value) => (
              <option key={value} value={value}>
                {HORIZONS[value].label}
              </option>
            ))}
          </select>
          {horizon === 'custom' && (
            <label className="inline-field">
              <span>Days:</span>
              <input
                type="number"
                min={1}
                value={customDays}
                onChange={(event) => handleCustomDaysChange(event.target.value)}
              />
            </label>
          )}
        </div>
      </div>

      <div className="stats-grid">
        <article className="stat-card">
          <span>Total practice</span>
          <strong>{formatMinutes(analytics.summary.totalMinutes)}</strong>
        </article>
        <article className="stat-card">
          <span>Sessions</span>
          <strong>{analytics.summary.sessionCount}</strong>
        </article>
        <article className="stat-card">
          <span>Avg / session</span>
          <strong>{formatMinutes(analytics.summary.avgMinutesPerSession)}</strong>
        </article>
        <article className="stat-card">
          <span>Avg / active day</span>
          <strong>{formatMinutes(analytics.summary.minutesPerDay)}</strong>
        </article>
      </div>

      <div className="breakdown-list">
        {analytics.byPiece.map((piece) => (
          <article className="breakdown-card" key={piece.piece}>
            <header>
              <h3>{piece.piece}</h3>
              <strong>{formatMinutes(piece.minutes)}</strong>
            </header>
            <ul>
              {piece.focusBreakdown.map((focus) => (
                <li key={`${piece.piece}-${focus.focusArea}`}>
                  <span>{focus.focusArea}</span>
                  <span>{formatMinutes(focus.minutes)}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
        {!analytics.byPiece.length && (
          <p className="muted">No data.</p>
        )}
      </div>
    </section>
  )
}
