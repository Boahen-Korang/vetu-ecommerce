import { useState, useEffect } from 'react'
import { navigate } from './router'
import { useCart, setQty, removeItem, startCheckout } from './cart'
import { formatPrice } from './products'
import { useMediaQuery } from './useMediaQuery'
import SiteHeader from './SiteHeader'

export default function Cart() {
  const items = useCart()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [email, setEmail] = useState('')
  const stack = useMediaQuery('(max-width: 760px)')

  useEffect(() => {
    const prev = document.body.style.cursor
    document.body.style.cursor = 'auto'
    return () => { document.body.style.cursor = prev }
  }, [])

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)

  const checkout = async () => {
    setErr('')
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setErr('Enter a valid email for your receipt.')
      return
    }
    setBusy(true)
    try {
      await startCheckout(email.trim()) // navigates away on success
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Checkout failed.')
      setBusy(false)
    }
  }

  const stepBtn: React.CSSProperties = { width: 30, height: 30, fontFamily: "'DM Mono',monospace", fontSize: 14, color: '#f0ece4', background: 'none', border: '1px solid rgba(240,236,228,0.14)', cursor: 'pointer' }

  return (
    <div style={{ background: '#060606', minHeight: '100vh', color: '#f0ece4', cursor: 'auto' }}>
      <SiteHeader active="cart" />

      <section style={{ padding: '72px clamp(20px,5vw,56px) 120px', maxWidth: 1040, margin: '0 auto' }}>
        <p className="font-mono-dm" style={{ fontSize: 10, letterSpacing: '0.24em', color: '#c9b99a', textTransform: 'uppercase', marginBottom: 14 }}>— Your bag</p>
        <h1 className="font-display" style={{ fontSize: 'clamp(36px, 5vw, 68px)', fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1, marginBottom: 48 }}>Shopping bag</h1>

        {items.length === 0 ? (
          <div style={{ padding: '40px 0' }}>
            <p className="font-mono-dm" style={{ fontSize: 12, letterSpacing: '0.06em', color: 'rgba(240,236,228,0.45)', marginBottom: 24 }}>Your bag is empty.</p>
            <button onClick={() => navigate('/shop')} className="font-mono-dm" style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#060606', background: '#f0ece4', border: 'none', padding: '14px 30px', cursor: 'pointer' }}>Browse the collection →</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: stack ? '1fr' : 'minmax(0,1fr) 320px', gap: stack ? 40 : 56, alignItems: 'start' }}>
            {/* Items */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {items.map(it => (
                <div key={it.id + '::' + it.size} style={{ display: 'flex', gap: 20, padding: '22px 0', borderBottom: '1px solid rgba(240,236,228,0.07)' }}>
                  <img src={it.img} alt={it.name} style={{ width: 84, height: 108, objectFit: 'cover', background: '#0e0e0e', flex: 'none' }} />
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <h3 className="font-display" style={{ fontSize: 19, fontWeight: 600, color: '#f0ece4' }}>{it.name}</h3>
                      <span className="font-mono-dm" style={{ fontSize: 13, color: '#c9b99a', whiteSpace: 'nowrap' }}>{formatPrice(it.price * it.qty)}</span>
                    </div>
                    <p className="font-mono-dm" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'rgba(240,236,228,0.4)', textTransform: 'uppercase', margin: '6px 0 auto' }}>Size {it.size} · {formatPrice(it.price)} each</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button aria-label="Decrease" onClick={() => setQty(it.id, it.size, it.qty - 1)} style={stepBtn}>–</button>
                        <span className="font-mono-dm" style={{ minWidth: 40, textAlign: 'center', fontSize: 13, color: '#f0ece4' }}>{it.qty}</span>
                        <button aria-label="Increase" onClick={() => setQty(it.id, it.size, it.qty + 1)} style={stepBtn}>+</button>
                      </div>
                      <button onClick={() => removeItem(it.id, it.size)} className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#cf6b52')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,236,228,0.4)')}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <aside style={{ position: 'sticky', top: 96, border: '1px solid rgba(240,236,228,0.1)', padding: 28 }}>
              <p className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.2em', color: '#c9b99a', textTransform: 'uppercase', marginBottom: 22 }}>Order summary</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span className="font-mono-dm" style={{ fontSize: 12, color: 'rgba(240,236,228,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Subtotal</span>
                <span className="font-mono-dm" style={{ fontSize: 13, color: '#f0ece4' }}>{formatPrice(subtotal)}</span>
              </div>
              <p style={{ fontSize: 11, color: 'rgba(240,236,228,0.35)', lineHeight: 1.6, margin: '0 0 20px' }}>Shipping &amp; taxes calculated at checkout.</p>
              <label className="font-mono-dm" style={{ display: 'block', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#c9b99a', marginBottom: 8 }}>Email for receipt</label>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); if (err) setErr('') }} placeholder="you@example.com"
                style={{ width: '100%', boxSizing: 'border-box', fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: '#f0ece4', background: 'rgba(240,236,228,0.04)', border: '1px solid rgba(240,236,228,0.14)', padding: '12px 14px', outline: 'none', marginBottom: 18 }} />
              <button onClick={checkout} disabled={busy} className="font-mono-dm"
                style={{ width: '100%', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#060606', background: '#f0ece4', border: 'none', padding: 16, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
                {busy ? 'Redirecting…' : 'Pay'}
              </button>
              {err && <p className="font-mono-dm" style={{ fontSize: 11.5, color: '#cf6b52', margin: '14px 0 0', lineHeight: 1.5 }}>{err}</p>}
              <p style={{ fontSize: 10, color: 'rgba(240,236,228,0.3)', textAlign: 'center', margin: '16px 0 0', letterSpacing: '0.06em' }}>Secure payment</p>
            </aside>
          </div>
        )}
      </section>
    </div>
  )
}
