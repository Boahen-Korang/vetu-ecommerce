import { useState, useEffect, type CSSProperties } from 'react'
import { navigate } from './router'

// ─── Design tokens (from the mockup) ────────────────────────────────────────────
const ACCENT = '#b9673f'
const RADIUS = 14
const SHOW_GOOGLE = true
const OK_BORDER = '#e5dccd'
const ERR_BORDER = '#cf6b52'
const HERO_IMG =
  'https://images.unsplash.com/photo-1445205170230-053b83016050?w=900&h=600&fit=crop&auto=format&q=90'

// ─── Validators ─────────────────────────────────────────────────────────────────
const vEmail = (v: string) =>
  /^\S+@\S+\.\S+$/.test(v) ? '' : v ? 'Enter a valid email address' : 'Email is required'
const vPw = (v: string) =>
  v.length >= 8 ? '' : v ? 'Password must be at least 8 characters' : 'Password is required'

// ─── Shared styles ──────────────────────────────────────────────────────────────
const labelStyle: CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em',
  textTransform: 'uppercase', color: '#8a7c6b', marginBottom: 6,
}
const errStyle: CSSProperties = { minHeight: 18, fontSize: 12.5, color: '#b3452f', paddingTop: 4 }

function field(border: string, focused: boolean, extra?: CSSProperties): CSSProperties {
  return {
    width: '100%', boxSizing: 'border-box', padding: '14px 16px',
    font: "500 16px 'Karla',sans-serif", color: '#33291f',
    background: focused ? '#fffdf8' : '#fbf7ee',
    border: `1.5px solid ${focused ? ACCENT : border}`,
    borderRadius: RADIUS, outline: 'none', ...extra,
  }
}

const primaryBtn: CSSProperties = {
  width: '100%', padding: 15, border: 'none', borderRadius: RADIUS,
  background: ACCENT, color: '#fffdf8', font: "700 16px 'Karla',sans-serif",
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: 10, marginTop: 6,
}
const googleBtn: CSSProperties = {
  width: '100%', padding: 13, border: '1.5px solid #e5dccd', borderRadius: RADIUS,
  background: '#fffdf8', color: '#33291f', font: "600 15px 'Karla',sans-serif",
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#bdb098', fontSize: 12.5, letterSpacing: '0.08em' }}>
      <span style={{ flex: 1, height: 1, background: '#e5dccd' }} />OR<span style={{ flex: 1, height: 1, background: '#e5dccd' }} />
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────────
type Screen = 'login' | 'signup' | 'success'

export default function Auth({ initial = 'login' }: { initial?: 'login' | 'signup' }) {
  const [screen, setScreen] = useState<Screen>(initial)
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState('')
  const [resetMsg, setResetMsg] = useState('')

  // login state
  const [lEmail, setLEmail] = useState('')
  const [lPw, setLPw] = useState('')
  const [lShowPw, setLShowPw] = useState(false)
  const [lTouched, setLTouched] = useState<Record<string, boolean>>({})
  const [lSub, setLSub] = useState(false)

  // signup state
  const [sName, setSName] = useState('')
  const [sEmail, setSEmail] = useState('')
  const [sPw, setSPw] = useState('')
  const [sCpw, setSCpw] = useState('')
  const [sTerms, setSTerms] = useState(false)
  const [sShowPw, setSShowPw] = useState(false)
  const [sTouched, setSTouched] = useState<Record<string, boolean>>({})
  const [sSub, setSSub] = useState(false)

  // success state
  const [successFrom, setSuccessFrom] = useState<'login' | 'signup'>('login')
  const [who, setWho] = useState('')

  // Keep the visible screen in sync with the URL (/login ↔ /signup).
  useEffect(() => { setScreen(initial) }, [initial])

  // Restore the normal cursor (the landing page hides it globally).
  useEffect(() => {
    const prev = document.body.style.cursor
    document.body.style.cursor = 'auto'
    return () => { document.body.style.cursor = prev }
  }, [])

  const finish = (from: 'login' | 'signup', name: string) => {
    setTimeout(() => { setLoading(false); setSuccessFrom(from); setWho(name); setScreen('success') }, 1100)
  }
  const touch = (setter: typeof setLTouched, f: string) => () =>
    setter(t => ({ ...t, [f]: true }))

  // Derived validation
  const lShow = (f: string) => lTouched[f] || lSub
  const sShow = (f: string) => sTouched[f] || sSub
  const lEmailErr = lShow('email') ? vEmail(lEmail) : ''
  const lPwErr = lShow('pw') ? vPw(lPw) : ''
  const sNameErr = sShow('name') ? (sName.trim() ? '' : 'Name is required') : ''
  const sEmailErr = sShow('email') ? vEmail(sEmail) : ''
  const sPwErr = sShow('pw') ? vPw(sPw) : ''
  const sCpwErr = sShow('cpw')
    ? sCpw === sPw && sCpw ? '' : sCpw ? 'Passwords do not match' : 'Please confirm your password'
    : ''
  const sTermsErr = sSub && !sTerms ? 'Please accept the terms to continue' : ''

  const submitLogin = () => {
    setLSub(true)
    if (!vEmail(lEmail) && !vPw(lPw)) {
      setLoading(true); setResetMsg('')
      finish('login', lEmail.split('@')[0])
    }
  }
  const submitSignup = () => {
    setSSub(true)
    const ok = sName.trim() && !vEmail(sEmail) && !vPw(sPw) && sCpw === sPw && sCpw && sTerms
    if (ok) { setLoading(true); finish('signup', sName.split(' ')[0]) }
  }
  const googleSignIn = () => {
    setLoading(true)
    finish(screen === 'signup' ? 'signup' : 'login', 'Google')
  }
  const forgotPw = (e: React.MouseEvent) => {
    e.preventDefault()
    setResetMsg(vEmail(lEmail) === ''
      ? 'Reset link sent to ' + lEmail + '. Check your inbox.'
      : 'Enter your email above first — then we’ll send you a reset link.')
  }
  const resetAll = () => {
    setLoading(false); setLSub(false); setSSub(false)
    setLPw(''); setSPw(''); setSCpw(''); setResetMsg('')
    navigate('/login')
  }

  const spinner = (
    <span style={{ width: 16, height: 16, border: '2px solid rgba(255,253,248,0.4)', borderTopColor: '#fffdf8', borderRadius: '50%', animation: 'spin .7s linear infinite', flex: 'none' }} />
  )
  const linkStyle: CSSProperties = { fontWeight: 700, color: ACCENT }

  return (
    <div className="auth-scope" style={{ minHeight: '100vh', background: '#f6efe4', display: 'flex', justifyContent: 'center', fontFamily: "'Karla',sans-serif", color: '#33291f' }}>
      <div style={{ width: '100%', maxWidth: 430, background: '#fffdf8', display: 'flex', flexDirection: 'column', boxShadow: '0 0 44px rgba(51,41,31,0.07)' }}>

        {/* Hero photo */}
        <div style={{ position: 'relative', height: 238, flex: 'none', background: '#ece2cf' }}>
          <img src={HERO_IMG} alt="VÊTU new collection lifestyle" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <a href="/" onClick={e => { e.preventDefault(); navigate('/') }}
            style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(255,253,248,0.9)', color: '#33291f', fontSize: 12.5, fontWeight: 700, letterSpacing: '0.04em', padding: '7px 13px', borderRadius: 999, textDecoration: 'none' }}>
            ← Back to VÊTU
          </a>
        </div>

        <div style={{ position: 'relative', marginTop: -26, flex: 1, background: '#fffdf8', borderRadius: '26px 26px 0 0', boxShadow: '0 -10px 30px rgba(51,41,31,0.10)', padding: '28px 26px 44px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ textAlign: 'center', fontFamily: "'Source Serif 4',serif", fontSize: 21, fontWeight: 600, letterSpacing: '0.22em', marginBottom: 22 }}>VÊTU</div>

          {/* ── Login ── */}
          {screen === 'login' && (
            <div style={{ animation: 'rise .35s ease', display: 'flex', flexDirection: 'column' }}>
              <h1 style={{ fontFamily: "'Source Serif 4',serif", fontSize: 27, fontWeight: 600, margin: '0 0 6px' }}>Welcome back</h1>
              <p style={{ margin: '0 0 22px', fontSize: 14.5, lineHeight: 1.5, color: '#8a7c6b' }}>Sign in to see your orders and saved items.</p>

              {SHOW_GOOGLE && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 18 }}>
                  <button onClick={googleSignIn} style={googleBtn}><GoogleIcon />Continue with Google</button>
                  <Divider />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input type="email" value={lEmail} placeholder="you@example.com"
                    onChange={e => { setLEmail(e.target.value); if (resetMsg) setResetMsg('') }}
                    onFocus={() => setFocused('lEmail')} onBlur={() => { setFocused(''); touch(setLTouched, 'email')() }}
                    style={field(lEmailErr ? ERR_BORDER : OK_BORDER, focused === 'lEmail')} />
                  <div style={errStyle}>{lEmailErr}</div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
                    <a href="#" onClick={forgotPw} style={{ fontSize: 13, fontWeight: 600, color: ACCENT }}>Forgot password?</a>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input type={lShowPw ? 'text' : 'password'} value={lPw} placeholder="Your password"
                      onChange={e => setLPw(e.target.value)}
                      onFocus={() => setFocused('lPw')} onBlur={() => { setFocused(''); touch(setLTouched, 'pw')() }}
                      style={field(lPwErr ? ERR_BORDER : OK_BORDER, focused === 'lPw', { padding: '14px 70px 14px 16px' })} />
                    <button onClick={() => setLShowPw(v => !v)} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', font: "600 13px 'Karla',sans-serif", color: '#8a7c6b', cursor: 'pointer', padding: '8px 10px' }}>{lShowPw ? 'Hide' : 'Show'}</button>
                  </div>
                  <div style={errStyle}>{lPwErr}</div>
                </div>
              </div>

              {resetMsg && (
                <div style={{ background: '#f3ead9', borderRadius: 12, padding: '11px 14px', fontSize: 13.5, lineHeight: 1.45, color: '#6d5c46', marginBottom: 14 }}>{resetMsg}</div>
              )}

              <button onClick={submitLogin} disabled={loading} style={primaryBtn}>
                {loading ? <>{spinner}<span>Signing in…</span></> : <span>Sign in</span>}
              </button>

              <p style={{ textAlign: 'center', fontSize: 14.5, color: '#8a7c6b', margin: '24px 0 0' }}>
                New here? <a href="/signup" onClick={e => { e.preventDefault(); setLSub(false); setResetMsg(''); navigate('/signup') }} style={linkStyle}>Create an account</a>
              </p>
            </div>
          )}

          {/* ── Signup ── */}
          {screen === 'signup' && (
            <div style={{ animation: 'rise .35s ease', display: 'flex', flexDirection: 'column' }}>
              <h1 style={{ fontFamily: "'Source Serif 4',serif", fontSize: 27, fontWeight: 600, margin: '0 0 6px' }}>Create your account</h1>
              <p style={{ margin: '0 0 22px', fontSize: 14.5, lineHeight: 1.5, color: '#8a7c6b' }}>Faster checkout, order tracking, and saved favorites.</p>

              {SHOW_GOOGLE && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 18 }}>
                  <button onClick={googleSignIn} style={googleBtn}><GoogleIcon />Sign up with Google</button>
                  <Divider />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <label style={labelStyle}>Full name</label>
                  <input type="text" value={sName} placeholder="Jane Fuller"
                    onChange={e => setSName(e.target.value)}
                    onFocus={() => setFocused('sName')} onBlur={() => { setFocused(''); touch(setSTouched, 'name')() }}
                    style={field(sNameErr ? ERR_BORDER : OK_BORDER, focused === 'sName')} />
                  <div style={errStyle}>{sNameErr}</div>
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input type="email" value={sEmail} placeholder="you@example.com"
                    onChange={e => setSEmail(e.target.value)}
                    onFocus={() => setFocused('sEmail')} onBlur={() => { setFocused(''); touch(setSTouched, 'email')() }}
                    style={field(sEmailErr ? ERR_BORDER : OK_BORDER, focused === 'sEmail')} />
                  <div style={errStyle}>{sEmailErr}</div>
                </div>
                <div>
                  <label style={labelStyle}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={sShowPw ? 'text' : 'password'} value={sPw} placeholder="At least 8 characters"
                      onChange={e => setSPw(e.target.value)}
                      onFocus={() => setFocused('sPw')} onBlur={() => { setFocused(''); touch(setSTouched, 'pw')() }}
                      style={field(sPwErr ? ERR_BORDER : OK_BORDER, focused === 'sPw', { padding: '14px 70px 14px 16px' })} />
                    <button onClick={() => setSShowPw(v => !v)} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', font: "600 13px 'Karla',sans-serif", color: '#8a7c6b', cursor: 'pointer', padding: '8px 10px' }}>{sShowPw ? 'Hide' : 'Show'}</button>
                  </div>
                  <div style={errStyle}>{sPwErr}</div>
                </div>
                <div>
                  <label style={labelStyle}>Confirm password</label>
                  <input type={sShowPw ? 'text' : 'password'} value={sCpw} placeholder="Repeat your password"
                    onChange={e => setSCpw(e.target.value)}
                    onFocus={() => setFocused('sCpw')} onBlur={() => { setFocused(''); touch(setSTouched, 'cpw')() }}
                    style={field(sCpwErr ? ERR_BORDER : OK_BORDER, focused === 'sCpw')} />
                  <div style={errStyle}>{sCpwErr}</div>
                </div>
                <div>
                  <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5, lineHeight: 1.5, color: '#8a7c6b', cursor: 'pointer' }}>
                    <input type="checkbox" checked={sTerms} onChange={e => setSTerms(e.target.checked)} style={{ width: 17, height: 17, margin: '2px 0 0', flex: 'none', accentColor: ACCENT, cursor: 'pointer' }} />
                    <span>I agree to the <a href="#" onClick={e => e.preventDefault()} style={{ fontWeight: 600, color: ACCENT }}>Terms of Service</a> and <a href="#" onClick={e => e.preventDefault()} style={{ fontWeight: 600, color: ACCENT }}>Privacy Policy</a>.</span>
                  </label>
                  <div style={{ ...errStyle, paddingLeft: 27 }}>{sTermsErr}</div>
                </div>
              </div>

              <button onClick={submitSignup} disabled={loading} style={primaryBtn}>
                {loading ? <>{spinner}<span>Creating account…</span></> : <span>Create account</span>}
              </button>

              <p style={{ textAlign: 'center', fontSize: 14.5, color: '#8a7c6b', margin: '24px 0 0' }}>
                Already have an account? <a href="/login" onClick={e => { e.preventDefault(); setSSub(false); navigate('/login') }} style={linkStyle}>Sign in</a>
              </p>
            </div>
          )}

          {/* ── Success ── */}
          {screen === 'success' && (
            <div style={{ animation: 'rise .35s ease', textAlign: 'center', padding: '34px 0 10px' }}>
              <div style={{ width: 68, height: 68, borderRadius: '50%', background: '#edf0e2', color: '#6f7d4f', fontSize: 30, lineHeight: '68px', margin: '0 auto 20px' }}>✓</div>
              <h2 style={{ fontFamily: "'Source Serif 4',serif", fontSize: 26, fontWeight: 600, margin: '0 0 8px' }}>
                {successFrom === 'signup' ? 'Account created' : 'You’re in'}
              </h2>
              <p style={{ margin: '0 0 28px', fontSize: 14.5, lineHeight: 1.5, color: '#8a7c6b' }}>
                {successFrom === 'signup'
                  ? 'Welcome' + (who && who !== 'Google' ? ', ' + who : '') + ' — your account is ready. Happy shopping.'
                  : 'Signed in' + (who && who !== 'Google' ? ' as ' + who : ' with Google') + '. Picking up right where you left off.'}
              </p>
              <button onClick={resetAll} style={{ padding: '13px 28px', border: '1.5px solid #e5dccd', borderRadius: RADIUS, background: '#fffdf8', color: '#33291f', font: "600 15px 'Karla',sans-serif", cursor: 'pointer' }}>Back to sign in</button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
