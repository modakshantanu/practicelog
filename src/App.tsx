import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { DashboardView } from './components/DashboardView'
import { PwaInstallHint } from './components/PwaInstallHint'
import { RecordView } from './components/RecordView'
import { SessionsView } from './components/SessionsView'
import { getSuggestions, loadSessions, saveSessions, upsertSession } from './storage'
import type { PracticeSession } from './types'

const IS_DEV = import.meta.env.DEV

function App() {
  const [activeTab, setActiveTab] = useState<'record' | 'sessions' | 'dashboard'>(
    'record',
  )
  const [sessions, setSessions] = useState<PracticeSession[]>(() => loadSessions())
  const [isOnline, setIsOnline] = useState(() => window.navigator.onLine)

  useEffect(() => {
    saveSessions(sessions)
  }, [sessions])

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const suggestions = useMemo(() => getSuggestions(sessions), [sessions])

  const handleSaveSession = (session: PracticeSession) => {
    setSessions((current) => upsertSession(current, session))
    setActiveTab('sessions')
  }

  const handleUpdateSession = (nextSession: PracticeSession) => {
    setSessions((current) => upsertSession(current, nextSession))
  }

  const handleLoadFakeProfile = async () => {
    if (!IS_DEV) {
      return
    }

    const approved = window.confirm(
      'Load fake profile data? This replaces current local sessions.',
    )
    if (!approved) {
      return
    }

    const { createFakeProfileSessions } = await import('./utils/mockProfile')
    setSessions(createFakeProfileSessions())
    setActiveTab('dashboard')
  }

  const handleClearSessions = () => {
    const approved = window.confirm('Clear all local sessions?')
    if (!approved) {
      return
    }

    setSessions([])
    setActiveTab('record')
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Practice Log</h1>
        </div>
        <nav className={`tab-nav${IS_DEV ? ' dev' : ''}`} aria-label="Main sections">
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
          {IS_DEV && (
            <button className="ghost" type="button" onClick={handleLoadFakeProfile}>
              Load sample profile
            </button>
          )}
        </nav>
      </header>

      {!isOnline && (
        <div className="network-banner" role="status" aria-live="polite">
          Offline mode: local changes are saved on this device.
        </div>
      )}

      <PwaInstallHint />

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
            onClearAllData={handleClearSessions}
          />
        )}

        {activeTab === 'dashboard' && <DashboardView sessions={sessions} />}
      </main>
    </div>
  )
}

export default App
