import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import {
  beginGoogleSignIn,
  fetchCloudSessions,
  fetchCurrentUser,
  ingestAuthTokenFromUrl,
  saveCloudSessions,
  type AuthUser,
  signOutCurrentUser,
} from './auth/renderAuth'
import { AuthView } from './components/AuthView'
import { DashboardView } from './components/DashboardView'
import { PwaInstallHint } from './components/PwaInstallHint'
import { RecordView } from './components/RecordView'
import { SessionsView } from './components/SessionsView'
import {
  getSuggestions,
  loadSessions,
  sanitizeSessions,
  saveSessions,
  upsertSession,
} from './storage'
import type { PracticeSession } from './types'

const IS_DEV = import.meta.env.DEV
type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline'

function toSortTime(isoDate: string): number {
  return new Date(isoDate).getTime() || 0
}

function mergeSessionsByRecency(
  local: PracticeSession[],
  remote: PracticeSession[],
): PracticeSession[] {
  const map = new Map<string, PracticeSession>()

  local.forEach((session) => {
    map.set(session.id, session)
  })

  remote.forEach((session) => {
    const existing = map.get(session.id)
    if (!existing) {
      map.set(session.id, session)
      return
    }

    const existingTime = toSortTime(existing.updatedAt || existing.createdAt)
    const incomingTime = toSortTime(session.updatedAt || session.createdAt)
    if (incomingTime >= existingTime) {
      map.set(session.id, session)
    }
  })

  return [...map.values()].sort((a, b) => toSortTime(b.startTime) - toSortTime(a.startTime))
}

function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authActionLoading, setAuthActionLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [activeTab, setActiveTab] = useState<'record' | 'sessions' | 'dashboard'>(
    'record',
  )
  const [sessions, setSessions] = useState<PracticeSession[]>(() => loadSessions())
  const [isOnline, setIsOnline] = useState(() => window.navigator.onLine)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const sessionsRef = useRef<PracticeSession[]>(sessions)
  const cloudReadyRef = useRef(false)
  const lastSyncedDigestRef = useRef('')
  const syncTimerRef = useRef<number | null>(null)

  useEffect(() => {
    sessionsRef.current = sessions
  }, [sessions])

  useEffect(() => {
    saveSessions(sessions)
  }, [sessions])

  useEffect(() => {
    if (!currentUser) {
      cloudReadyRef.current = false
      lastSyncedDigestRef.current = ''
      setSyncStatus('idle')
      if (syncTimerRef.current != null) {
        window.clearTimeout(syncTimerRef.current)
        syncTimerRef.current = null
      }
      return
    }

    let cancelled = false

    const hydrateFromCloud = async () => {
      setSyncStatus('syncing')
      try {
        const remoteResult = await fetchCloudSessions()
        if (cancelled) {
          return
        }

        const remoteSessions = sanitizeSessions(remoteResult.sessions)
        const localSessions = sessionsRef.current

        if (!remoteSessions.length && localSessions.length) {
          await saveCloudSessions(localSessions)
          if (cancelled) {
            return
          }

          lastSyncedDigestRef.current = JSON.stringify(localSessions)
          cloudReadyRef.current = true
          setSyncStatus('synced')
          return
        }

        const merged = mergeSessionsByRecency(localSessions, remoteSessions)
        setSessions(merged)
        lastSyncedDigestRef.current = JSON.stringify(merged)
        cloudReadyRef.current = true
        setSyncStatus('synced')
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : 'Unable to sync sessions from cloud.'
          setAuthError(message)
          setSyncStatus('error')
        }
      }
    }

    void hydrateFromCloud()

    return () => {
      cancelled = true
    }
  }, [currentUser])

  useEffect(() => {
    let cancelled = false

    ingestAuthTokenFromUrl()

    fetchCurrentUser()
      .then((user) => {
        if (!cancelled) {
          setCurrentUser(user)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAuthError('Unable to reach auth service. Check server config.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAuthLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!currentUser || !cloudReadyRef.current) {
      return
    }

    if (!isOnline) {
      setSyncStatus('offline')
      return
    }

    const digest = JSON.stringify(sessions)
    if (digest === lastSyncedDigestRef.current) {
      if (syncStatus !== 'synced') {
        setSyncStatus('synced')
      }
      return
    }

    if (syncTimerRef.current != null) {
      window.clearTimeout(syncTimerRef.current)
    }

    syncTimerRef.current = window.setTimeout(() => {
      setSyncStatus('syncing')
      void saveCloudSessions(sessions)
        .then(() => {
          lastSyncedDigestRef.current = digest
          setSyncStatus('synced')
        })
        .catch(() => {
          setAuthError('Unable to sync sessions to cloud.')
          setSyncStatus('error')
        })
    }, 800)

    return () => {
      if (syncTimerRef.current != null) {
        window.clearTimeout(syncTimerRef.current)
      }
    }
  }, [currentUser, isOnline, sessions, syncStatus])

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

    if (currentUser && window.location.hostname !== 'localhost') {
      setAuthError('Sample profile loading is blocked outside localhost while signed in.')
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

  const handleSignIn = async () => {
    setAuthError('')
    beginGoogleSignIn()
  }

  const handleSignOut = async () => {
    setAuthError('')
    setAuthActionLoading(true)
    try {
      await signOutCurrentUser()
      setCurrentUser(null)
      setAuthError('')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Sign-out failed. Please try again.'
      setAuthError(message)
    } finally {
      setAuthActionLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="app-shell">
        <section className="panel auth-panel">
          <p className="muted">Loading account...</p>
        </section>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="app-shell auth-only-shell">
        <AuthView
          configured
          loading={authActionLoading}
          error={authError}
          onSignIn={handleSignIn}
        />
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-top">
          <h1 className="app-title">
            <span>Practice Log</span>
            <span
              className={`sync-indicator ${syncStatus}`}
              role="status"
              aria-label={`Sync status: ${syncStatus}`}
              title={`Sync status: ${syncStatus}`}
            >
              {syncStatus === 'syncing'
                ? ''
                : syncStatus === 'synced'
                  ? '✓'
                  : syncStatus === 'error'
                    ? '!'
                    : syncStatus === 'offline'
                      ? '○'
                      : ''}
            </span>
          </h1>
          <p className="auth-user">
            Signed in as {currentUser.name ?? currentUser.email ?? 'Google user'}
          </p>
        </div>
        <nav className={`tab-nav with-auth${IS_DEV ? ' dev' : ''}`} aria-label="Main sections">
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
          <button className="ghost" type="button" onClick={handleSignOut}>
            {authActionLoading ? 'Signing out...' : 'Sign out'}
          </button>
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
