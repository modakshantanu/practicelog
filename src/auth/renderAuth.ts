export type AuthUser = {
  id: number
  email: string | null
  name: string | null
  avatarUrl: string | null
}

export type CloudSessionsResponse = {
  sessions: unknown[]
  updatedAt: string | null
}

const AUTH_TOKEN_KEY = 'practice_log_auth_token_v1'

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

function getAuthToken(): string | null {
  const value = window.localStorage.getItem(AUTH_TOKEN_KEY)
  return value && value.trim() ? value : null
}

function setAuthToken(token: string): void {
  window.localStorage.setItem(AUTH_TOKEN_KEY, token)
}

function clearAuthToken(): void {
  window.localStorage.removeItem(AUTH_TOKEN_KEY)
}

export function ingestAuthTokenFromUrl(): void {
  const url = new URL(window.location.href)
  const token = url.searchParams.get('auth_token')
  if (!token) {
    return
  }

  setAuthToken(token)
  url.searchParams.delete('auth_token')
  window.history.replaceState({}, document.title, url.pathname + url.search + url.hash)
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const token = getAuthToken()

  const response = await fetch(buildUrl('/auth/me'), {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })

  if (response.status === 401) {
    clearAuthToken()
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
  window.location.assign(buildUrl('/auth/google'))
}

export async function signOutCurrentUser(): Promise<void> {
  const token = getAuthToken()

  const response = await fetch(buildUrl('/auth/logout'), {
    method: 'POST',
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })

  if (!response.ok && response.status !== 204) {
    throw new Error('Sign-out failed.')
  }

  clearAuthToken()
}

export async function fetchCloudSessions(): Promise<CloudSessionsResponse> {
  const token = getAuthToken()

  const response = await fetch(buildUrl('/api/sessions'), {
    method: 'GET',
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })

  if (!response.ok) {
    throw new Error('Unable to fetch cloud sessions.')
  }

  const payload = (await response.json()) as CloudSessionsResponse
  return {
    sessions: Array.isArray(payload.sessions) ? payload.sessions : [],
    updatedAt: typeof payload.updatedAt === 'string' ? payload.updatedAt : null,
  }
}

export async function saveCloudSessions(sessions: unknown[]): Promise<void> {
  const token = getAuthToken()

  const response = await fetch(buildUrl('/api/sessions'), {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ sessions }),
  })

  if (!response.ok) {
    throw new Error('Unable to save cloud sessions.')
  }
}
