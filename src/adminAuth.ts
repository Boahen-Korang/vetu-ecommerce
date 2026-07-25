// ─── Admin session gate ──────────────────────────────────────────────────────
// This is a client-side passcode gate for a static site with no backend. It
// keeps the admin console out of casual reach, but it is NOT real security —
// the passcode ships in the bundle. Put a real auth check server-side once a
// backend exists. Override the passcode at build time with VITE_ADMIN_PASSCODE.

const SESSION_KEY = 'vetu_admin_session'
const PW_KEY = 'vetu_admin_pw'
const PASSCODE = (import.meta.env.VITE_ADMIN_PASSCODE as string | undefined) || 'vetu-admin'

export function isAdminAuthed(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === 'ok'
  } catch {
    return false
  }
}

/** Returns true and opens a session if the passcode is correct. */
export function adminLogin(passcode: string): boolean {
  const ok = passcode === PASSCODE
  if (ok) {
    try {
      sessionStorage.setItem(SESSION_KEY, 'ok')
      // Remembered so the dashboard can authorize server-side admin actions.
      sessionStorage.setItem(PW_KEY, passcode)
    } catch { /* ignore */ }
  }
  return ok
}

/** The passcode entered at login — sent to the server to authorize admin API calls. */
export function adminPasscode(): string {
  try { return sessionStorage.getItem(PW_KEY) || '' } catch { return '' }
}

export function adminLogout(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(PW_KEY)
  } catch { /* ignore */ }
}
