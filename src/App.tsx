import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { DashboardView } from './components/DashboardView'
import { RecordView } from './components/RecordView'
import { SessionsView } from './components/SessionsView'
import { getSuggestions, loadSessions, saveSessions, upsertSession } from './storage'
import type { PracticeSession } from './types'

function App() {
  const [activeTab, setActiveTab] = useState<'record' | 'sessions' | 'dashboard'>(
    'record',
  )
  const [sessions, setSessions] = useState<PracticeSession[]>(() => loadSessions())

  useEffect(() => {
    saveSessions(sessions)
  }, [sessions])

  const suggestions = useMemo(() => getSuggestions(sessions), [sessions])

  const handleSaveSession = (session: PracticeSession) => {
    setSessions((current) => upsertSession(current, session))
    setActiveTab('sessions')
  }

  const handleUpdateSession = (nextSession: PracticeSession) => {
    setSessions((current) => upsertSession(current, nextSession))
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Practice Log</h1>
        </div>
        <nav className="tab-nav" aria-label="Main sections">
          <button
            className={activeTab === 'record' ? 'active' : ''}
            onClick={() => setActiveTab('record')}
            type="button"
          >
            Record
          </button>
          <button
            className={activeTab === 'sessions' ? 'active' : ''}
            onClick={() => setActiveTab('sessions')}
            type="button"
          >
            Sessions
          </button>
          <button
            className={activeTab === 'dashboard' ? 'active' : ''}
            onClick={() => setActiveTab('dashboard')}
            type="button"
          >
            Dashboard
          </button>
        </nav>
      </header>

      <main className="content">
        {activeTab === 'record' && (
          <RecordView suggestions={suggestions} onSaveSession={handleSaveSession} />
        )}

        {activeTab === 'sessions' && (
          <SessionsView
            sessions={sessions}
            suggestions={suggestions}
            onDeleteSessions={setSessions}
            onUpdateSession={handleUpdateSession}
          />
        )}

        {activeTab === 'dashboard' && <DashboardView sessions={sessions} />}
      </main>
    </div>
  )
}

export default App
