import { useEffect } from 'react'
import { navigate } from './router'
import { clearCart } from './cart'

export default function CheckoutSuccess() {
  useEffect(() => {
    clearCart() // payment succeeded — empty the bag
    const prev = document.body.style.cursor
    document.body.style.cursor = 'auto'
    return () => { document.body.style.cursor = prev }
  }, [])

  return (
    <div style={{ background: '#060606', minHeight: '100vh', color: '#f0ece4', cursor: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 460, textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(201,185,154,0.14)', color: '#c9b99a', fontSize: 32, lineHeight: '72px', margin: '0 auto 28px' }}>✓</div>
        <p className="font-mono-dm" style={{ fontSize: 10, letterSpacing: '0.24em', color: '#c9b99a', textTransform: 'uppercase', marginBottom: 16 }}>— Order confirmed</p>
        <h1 className="font-display" style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.05, marginBottom: 18 }}>Thank you for your order.</h1>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'rgba(240,236,228,0.5)', marginBottom: 40 }}>
          Your payment was successful and your bag has been cleared. A confirmation email is on its way — we&rsquo;ll let you know as soon as your pieces ship.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/shop')} className="font-mono-dm" style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#060606', background: '#f0ece4', border: 'none', padding: '14px 30px', cursor: 'pointer' }}>Continue shopping</button>
          <button onClick={() => navigate('/')} className="font-mono-dm" style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.6)', background: 'none', border: '1px solid rgba(240,236,228,0.14)', padding: '14px 26px', cursor: 'pointer' }}>Home</button>
        </div>
      </div>
    </div>
  )
}
