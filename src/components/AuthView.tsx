type AuthViewProps = {
  configured: boolean
  loading: boolean
  error: string
  onSignIn: () => void
}

export function AuthView({ configured, loading, error, onSignIn }: AuthViewProps) {
  return (
    <section className="panel auth-panel">
      <div className="panel-head">
        <h2>Sign in</h2>
      </div>

      <p className="muted">
        Use Google to access your Render-hosted account session.
      </p>

      {!configured && (
        <p className="muted">
          Google Auth is not configured yet. Add backend environment variables to
          enable login.
        </p>
      )}

      {error && <p className="muted auth-error">{error}</p>}

      <div className="actions">
        <button
          type="button"
          className="btn primary"
          onClick={onSignIn}
          disabled={!configured || loading}
        >
          {loading ? 'Signing in...' : 'Continue with Google'}
        </button>
      </div>
    </section>
  )
}
