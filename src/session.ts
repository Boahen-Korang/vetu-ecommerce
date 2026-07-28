// ─── Customer session ────────────────────────────────────────────────────────
import { useSyncExternalStore } from 'react'

export type User = { id: string; name: string; email: string }

const TOKEN_KEY = 'vetu_token'
const USER_KEY = 'vetu_user'
const listeners = new Set<() => void>()

function read(): User | null {
  try { const r = localStorage.getItem(USER_KEY); return r ? (JSON.parse(r) as User) : null } catch { return null }
}
let cache: User | null = read()

function set(token: string | null, user: User | null) {
  try {
    if (token && user) { localStorage.setItem(TOKEN_KEY, token); localStorage.setItem(USER_KEY, JSON.stringify(user)) }
    else { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY) }
  } catch { /* ignore */ }
  cache = user
  listeners.forEach(l => l())
}

export function currentUser(): User | null { return cache }
export function token(): string { try { return localStorage.getItem(TOKEN_KEY) || '' } catch { return '' } }
export function logout() { set(null, null) }

export function useUser(): User | null {
  return useSyncExternalStore(cb => { listeners.add(cb); return () => { listeners.delete(cb) } }, () => cache)
}

async function post(path: string, body: unknown): Promise<User> {
  const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(d.error || 'Something went wrong.')
  set(d.token, d.user)
  return d.user as User
}

export const register = (name: string, email: string, password: string) => post('/api/auth/register', { name, email, password })
export const login = (email: string, password: string) => post('/api/auth/login', { email, password })
