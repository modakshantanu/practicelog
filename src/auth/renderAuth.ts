export type AuthUser = {
  id: number
  email: string | null
  name: string | null
  avatarUrl: string | null
}

type AuthMeResponse = {
  authenticated: boolean
  user?: AuthUser
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787')
  .trim()
  .replace(/\/$/, '')

function buildUrl(path: string): string {
  return `${API_BASE_URL}${path}`
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const response = await fetch(buildUrl('/auth/me'), {
    credentials: 'include',
  })

  if (response.status === 401) {
    return null
  }

  if (!response.ok) {
    throw new Error('Unable to check login state.')
  }

  const payload = (await response.json()) as AuthMeResponse
  if (!payload.authenticated || !payload.user) {
    return null
  }

  return payload.user
}

export function beginGoogleSignIn(): void {
  const returnTo = encodeURIComponent(window.location.origin)
  window.location.assign(buildUrl(`/auth/google?returnTo=${returnTo}`))
}

export async function signOutCurrentUser(): Promise<void> {
  const response = await fetch(buildUrl('/auth/logout'), {
    method: 'POST',
    credentials: 'include',
  })

  if (!response.ok && response.status !== 204) {
    throw new Error('Sign-out failed.')
  }
}
