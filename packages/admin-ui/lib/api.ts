export const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export async function apiFetch(path: string, options: RequestInit = {}) {
  if (!API_URL) throw new Error('API not configured')
  const signal = options.signal || AbortSignal.timeout(8000)
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    signal,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || `API error ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

let _apiConnected: boolean | null = null

export async function checkApiConnection(): Promise<boolean> {
  if (!API_URL) return false
  try {
    const res = await fetch(`${API_URL}/health`, { method: 'GET', signal: AbortSignal.timeout(3000) })
    _apiConnected = res.ok
  } catch {
    _apiConnected = false
  }
  return _apiConnected
}

export function isApiConfigured() {
  return !!API_URL
}

export async function apiAuthFetch(path: string, token: string, options: RequestInit = {}) {
  return apiFetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers
    }
  })
}
