import { useState, useEffect, useRef, useLayoutEffect, type CSSProperties } from 'react'
import { navigate } from './router'
import { login, register } from './session'

// ─── Palette ─────────────────────────────────────────────────────────────────
const PAPER = '#f0ece4'
const GOLD = '#c9b99a'
const GOLD_BRIGHT = '#d4af7a'
const ERR = '#e0806a'
const HERO_IMG =
  'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1600&h=1200&fit=crop&auto=format&q=80'

// ─── Validators ─────────────────────────────────────────────────────────────
const vEmail = (v: string) =>
  /^\S+@\S+\.\S+$/.test(v) ? '' : v ? 'Enter a valid email address' : 'Email is required'
const vPw = (v: string) =>
  v.length >= 8 ? '' : v ? 'Password must be at least 8 characters' : 'Password is required'

// ─── Shared styles ───────────────────────────────────────────────────────────
const labelStyle: CSSProperties = {
  display: 'block', fontFamily: "'DM Mono',monospace", fontSize: 10,
  letterSpacing: '0.16em', textTransform: 'uppercase', color: GOLD, marginBottom: 7,
}
const errStyle: CSSProperties = { minHeight: 16, fontSize: 12, color: ERR, paddingTop: 5, fontFamily: "'DM Sans',sans-serif" }

function field(hasErr: boolean, focused: boolean, extra?: CSSProperties): CSSProperties {
  return {
    width: '100%', boxSizing: 'border-box', padding: '13px 15px',
    fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: PAPER,
    background: focused ? 'rgba(240,236,228,0.08)' : 'rgba(240,236,228,0.04)',
    border: `1px solid ${hasErr ? 'rgba(224,128,106,0.6)' : focused ? 'rgba(212,175,122,0.6)' : 'rgba(240,236,228,0.14)'}`,
    outline: 'none', transition: 'border-color 0.2s, background 0.2s', ...extra,
  }
}

const primaryStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%',
  fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
  color: '#060606', background: PAPER, border: 'none', padding: 15, cursor: 'pointer', marginTop: 8,
  transition: 'background 0.25s',
}
const googleStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%',
  fontFamily: "'DM Mono',monospace", fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase',
  color: PAPER, background: 'transparent', border: '1px solid rgba(240,236,228,0.18)', padding: 13,
  cursor: 'pointer', transition: 'background 0.25s, border-color 0.25s',
}
const pwToggleStyle: CSSProperties = {
  position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', border: 'none',
  background: 'none', fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: 'rgba(240,236,228,0.5)', cursor: 'pointer', padding: '8px 10px',
}
const linkStyle: CSSProperties = { fontWeight: 600, color: GOLD_BRIGHT, cursor: 'pointer' }

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}
function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(240,236,228,0.35)', fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '0.14em' }}>
      <span style={{ flex: 1, height: 1, background: 'rgba(240,236,228,0.12)' }} />OR<span style={{ flex: 1, height: 1, background: 'rgba(240,236,228,0.12)' }} />
    </div>
  )
}
function Spinner() {
  return <span style={{ width: 15, height: 15, border: '2px solid rgba(6,6,6,0.25)', borderTopColor: '#060606', borderRadius: '50%', animation: 'spin .7s linear infinite', flex: 'none' }} />
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function Auth({ initial = 'login' }: { initial?: 'login' | 'signup' }) {
  const [screen, setScreen] = useState<'login' | 'signup'>(initial)
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState('')
  const [resetMsg, setResetMsg] = useState('')
  const [authErr, setAuthErr] = useState('')

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

  // sliding-panel height measurement
  const loginRef = useRef<HTMLDivElement>(null)
  const signupRef = useRef<HTMLDivElement>(null)
  const [h, setH] = useState<{ login: number; signup: number }>({ login: 0, signup: 0 })

  useEffect(() => { setScreen(initial) }, [initial])

  useEffect(() => {
    const prev = document.body.style.cursor
    document.body.style.cursor = 'auto'
    return () => { document.body.style.cursor = prev }
  }, [])

  useLayoutEffect(() => {
    const measure = () => setH({ login: loginRef.current?.offsetHeight || 0, signup: signupRef.current?.offsetHeight || 0 })
    measure()
    const ro = new ResizeObserver(measure)
    if (loginRef.current) ro.observe(loginRef.current)
    if (signupRef.current) ro.observe(signupRef.current)
    return () => ro.disconnect()
  }, [])

  const touch = (setter: typeof setLTouched, f: string) => () => setter(t => ({ ...t, [f]: true }))

  const lShow = (f: string) => lTouched[f] || lSub
  const sShow = (f: string) => sTouched[f] || sSub
  const lEmailErr = lShow('email') ? vEmail(lEmail) : ''
  const lPwErr = lShow('pw') ? vPw(lPw) : ''
  const sNameErr = sShow('name') ? (sName.trim() ? '' : 'Name is required') : ''
  const sEmailErr = sShow('email') ? vEmail(sEmail) : ''
  const sPwErr = sShow('pw') ? vPw(sPw) : ''
  const sCpwErr = sShow('cpw') ? (sCpw === sPw && sCpw ? '' : sCpw ? 'Passwords do not match' : 'Please confirm your password') : ''
  const sTermsErr = sSub && !sTerms ? 'Please accept the terms to continue' : ''

  const submitLogin = () => {
    setLSub(true); setAuthErr('')
    if (!vEmail(lEmail) && !vPw(lPw)) {
      setLoading(true); setResetMsg('')
      login(lEmail.trim(), lPw)
        .then(() => navigate('/shop'))
        .catch(e => { setAuthErr(e.message); setLoading(false) })
    }
  }
  const submitSignup = () => {
    setSSub(true); setAuthErr('')
    const ok = sName.trim() && !vEmail(sEmail) && !vPw(sPw) && sCpw === sPw && sCpw && sTerms
    if (ok) {
      setLoading(true)
      register(sName.trim(), sEmail.trim(), sPw)
        .then(() => navigate('/shop'))
        .catch(e => { setAuthErr(e.message); setLoading(false) })
    }
  }
  const googleSignIn = () => { setAuthErr('Google sign-in isn’t set up — please use your email.') }
  const forgotPw = (e: React.MouseEvent) => {
    e.preventDefault()
    setResetMsg(vEmail(lEmail) === ''
      ? 'Reset link sent to ' + lEmail + '. Check your inbox.'
      : 'Enter your email above first — then we’ll send you a reset link.')
  }

  const go = (m: 'login' | 'signup') => {
    setResetMsg('')
    if (m === 'login') setSSub(false); else setLSub(false)
    navigate('/' + m)
  }

  const activeH = screen === 'login' ? h.login : h.signup
  const primaryHover = { onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.background = GOLD), onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.background = PAPER) }
  const googleHover = { onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.background = 'rgba(240,236,228,0.06)'; e.currentTarget.style.borderColor = 'rgba(240,236,228,0.3)' }, onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(240,236,228,0.18)' } }

  return (
    <div className="auth-scope" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden', background: '#060606', fontFamily: "'DM Sans',sans-serif" }}>
      {/* Backdrop */}
      <img src={HERO_IMG} aria-hidden="true" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 25%', filter: 'brightness(0.28) saturate(0.7)', zIndex: 0 }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 35%, rgba(6,6,6,0.35), rgba(6,6,6,0.9))', zIndex: 1 }} />

      <a href="/" onClick={e => { e.preventDefault(); navigate('/') }} className="font-mono-dm"
        style={{ position: 'absolute', top: 28, left: 28, zIndex: 3, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.6)', textDecoration: 'none' }}>← Back to VÊTU</a>

      {/* Glass card */}
      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 428, background: 'rgba(12,11,10,0.55)', backdropFilter: 'blur(26px) saturate(130%)', WebkitBackdropFilter: 'blur(26px) saturate(130%)', border: '1px solid rgba(240,236,228,0.12)', boxShadow: '0 30px 80px rgba(0,0,0,0.55)', padding: '38px 32px' }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <span className="font-display" style={{ fontSize: 25, fontWeight: 700, letterSpacing: '0.28em', color: PAPER }}>VÊTU</span>
          <p className="font-mono-dm" style={{ fontSize: 9.5, letterSpacing: '0.22em', color: 'rgba(240,236,228,0.4)', textTransform: 'uppercase', margin: '11px 0 0' }}>
            {screen === 'login' ? 'Welcome back' : 'Join the house'}
          </p>
        </div>

        {/* Sliding toggle */}
        <div style={{ position: 'relative', display: 'flex', background: 'rgba(240,236,228,0.05)', border: '1px solid rgba(240,236,228,0.1)', padding: 4, marginBottom: 26 }}>
          <div style={{ position: 'absolute', top: 4, bottom: 4, left: 4, width: 'calc(50% - 4px)', background: PAPER, transform: screen === 'signup' ? 'translateX(100%)' : 'translateX(0)', transition: 'transform 0.45s cubic-bezier(0.16,1,0.3,1)' }} />
          {(['login', 'signup'] as const).map(m => (
            <button key={m} onClick={() => go(m)} className="font-mono-dm"
              style={{ position: 'relative', zIndex: 1, flex: 1, background: 'none', border: 'none', padding: '11px 0', cursor: 'pointer', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: screen === m ? '#060606' : 'rgba(240,236,228,0.55)', transition: 'color 0.3s' }}>
              {m === 'login' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        {/* Sliding track */}
        <div style={{ overflow: 'hidden', height: activeH ? activeH : 'auto', transition: 'height 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
          <div style={{ display: 'flex', width: '200%', transform: screen === 'signup' ? 'translateX(-50%)' : 'translateX(0)', transition: 'transform 0.5s cubic-bezier(0.16,1,0.3,1)' }}>

            {/* ── Login panel ── */}
            <div style={{ width: '50%' }}>
              <div ref={loginRef} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={googleSignIn} style={googleStyle} {...googleHover}><GoogleIcon />Continue with Google</button>
                <div style={{ margin: '10px 0 4px' }}><Divider /></div>

                <div>
                  <label style={labelStyle}>Email</label>
                  <input type="email" value={lEmail} placeholder="you@example.com"
                    onChange={e => { setLEmail(e.target.value); if (resetMsg) setResetMsg('') }}
                    onFocus={() => setFocused('lEmail')} onBlur={() => { setFocused(''); touch(setLTouched, 'email')() }}
                    style={field(!!lEmailErr, focused === 'lEmail')} />
                  <div style={errStyle}>{lEmailErr}</div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
                    <a href="#" onClick={forgotPw} style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '0.06em', color: GOLD_BRIGHT }}>Forgot?</a>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input type={lShowPw ? 'text' : 'password'} value={lPw} placeholder="Your password"
                      onChange={e => setLPw(e.target.value)}
                      onFocus={() => setFocused('lPw')} onBlur={() => { setFocused(''); touch(setLTouched, 'pw')() }}
                      style={field(!!lPwErr, focused === 'lPw', { paddingRight: 66 })} />
                    <button onClick={() => setLShowPw(v => !v)} style={pwToggleStyle}>{lShowPw ? 'Hide' : 'Show'}</button>
                  </div>
                  <div style={errStyle}>{lPwErr}</div>
                </div>

                {resetMsg && <div style={{ background: 'rgba(201,185,154,0.1)', border: '1px solid rgba(201,185,154,0.2)', padding: '10px 13px', fontSize: 13, lineHeight: 1.45, color: GOLD, marginBottom: 6 }}>{resetMsg}</div>}

                <button onClick={submitLogin} disabled={loading} style={primaryStyle} {...primaryHover}>
                  {loading ? <><Spinner />Signing in…</> : 'Sign in'}
                </button>
                {authErr && <p style={{ fontSize: 12.5, color: ERR, textAlign: 'center', margin: '10px 0 0' }}>{authErr}</p>}
                <p style={{ textAlign: 'center', fontSize: 13.5, color: 'rgba(240,236,228,0.5)', margin: '18px 0 0' }}>
                  New here? <a onClick={() => go('signup')} style={linkStyle}>Create an account</a>
                </p>
              </div>
            </div>

            {/* ── Signup panel ── */}
            <div style={{ width: '50%' }}>
              <div ref={signupRef} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={googleSignIn} style={googleStyle} {...googleHover}><GoogleIcon />Sign up with Google</button>
                <div style={{ margin: '10px 0 4px' }}><Divider /></div>

                <div>
                  <label style={labelStyle}>Full name</label>
                  <input type="text" value={sName} placeholder="Jane Fuller"
                    onChange={e => setSName(e.target.value)}
                    onFocus={() => setFocused('sName')} onBlur={() => { setFocused(''); touch(setSTouched, 'name')() }}
                    style={field(!!sNameErr, focused === 'sName')} />
                  <div style={errStyle}>{sNameErr}</div>
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input type="email" value={sEmail} placeholder="you@example.com"
                    onChange={e => setSEmail(e.target.value)}
                    onFocus={() => setFocused('sEmail')} onBlur={() => { setFocused(''); touch(setSTouched, 'email')() }}
                    style={field(!!sEmailErr, focused === 'sEmail')} />
                  <div style={errStyle}>{sEmailErr}</div>
                </div>
                <div>
                  <label style={labelStyle}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={sShowPw ? 'text' : 'password'} value={sPw} placeholder="At least 8 characters"
                      onChange={e => setSPw(e.target.value)}
                      onFocus={() => setFocused('sPw')} onBlur={() => { setFocused(''); touch(setSTouched, 'pw')() }}
                      style={field(!!sPwErr, focused === 'sPw', { paddingRight: 66 })} />
                    <button onClick={() => setSShowPw(v => !v)} style={pwToggleStyle}>{sShowPw ? 'Hide' : 'Show'}</button>
                  </div>
                  <div style={errStyle}>{sPwErr}</div>
                </div>
                <div>
                  <label style={labelStyle}>Confirm password</label>
                  <input type={sShowPw ? 'text' : 'password'} value={sCpw} placeholder="Repeat your password"
                    onChange={e => setSCpw(e.target.value)}
                    onFocus={() => setFocused('sCpw')} onBlur={() => { setFocused(''); touch(setSTouched, 'cpw')() }}
                    style={field(!!sCpwErr, focused === 'sCpw')} />
                  <div style={errStyle}>{sCpwErr}</div>
                </div>
                <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, lineHeight: 1.5, color: 'rgba(240,236,228,0.55)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={sTerms} onChange={e => setSTerms(e.target.checked)} style={{ width: 16, height: 16, margin: '1px 0 0', flex: 'none', accentColor: GOLD_BRIGHT, cursor: 'pointer' }} />
                  <span>I agree to the <a href="#" onClick={e => e.preventDefault()} style={{ color: GOLD_BRIGHT, fontWeight: 600 }}>Terms</a> and <a href="#" onClick={e => e.preventDefault()} style={{ color: GOLD_BRIGHT, fontWeight: 600 }}>Privacy Policy</a>.</span>
                </label>
                <div style={{ ...errStyle, paddingLeft: 26 }}>{sTermsErr}</div>

                <button onClick={submitSignup} disabled={loading} style={{ ...primaryStyle, marginTop: 2 }} {...primaryHover}>
                  {loading ? <><Spinner />Creating account…</> : 'Create account'}
                </button>
                {authErr && <p style={{ fontSize: 12.5, color: ERR, textAlign: 'center', margin: '10px 0 0' }}>{authErr}</p>}
                <p style={{ textAlign: 'center', fontSize: 13.5, color: 'rgba(240,236,228,0.5)', margin: '18px 0 0' }}>
                  Already have an account? <a onClick={() => go('login')} style={linkStyle}>Sign in</a>
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
