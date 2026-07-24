import type { CSSProperties } from 'react'
import { navigate } from './router'
import { useCart } from './cart'

const link = (active: boolean): CSSProperties => ({
  fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '0.18em',
  textTransform: 'uppercase', color: active ? '#f0ece4' : 'rgba(240,236,228,0.5)',
  background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.3s', padding: 0,
})

export default function SiteHeader({ active }: { active?: 'shop' | 'cart' }) {
  const items = useCart()
  const count = items.reduce((n, i) => n + i.qty, 0)

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 500, height: 72, padding: '0 clamp(20px,5vw,56px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(6,6,6,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(240,236,228,0.06)' }}>
      <a href="/" onClick={e => { e.preventDefault(); navigate('/') }} className="font-display" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.25em', color: '#f0ece4', textDecoration: 'none' }}>VÊTU</a>
      <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
        <button onClick={() => navigate('/shop')} className="font-mono-dm" style={link(active === 'shop')}
          onMouseEnter={e => (e.currentTarget.style.color = '#f0ece4')}
          onMouseLeave={e => (e.currentTarget.style.color = active === 'shop' ? '#f0ece4' : 'rgba(240,236,228,0.5)')}>Shop</button>
        <button onClick={() => navigate('/login')} className="font-mono-dm" style={link(false)}
          onMouseEnter={e => (e.currentTarget.style.color = '#f0ece4')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,236,228,0.5)')}>Sign In</button>
        <button onClick={() => navigate('/cart')} className="font-mono-dm"
          style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: active === 'cart' ? '#060606' : '#f0ece4', background: active === 'cart' ? '#f0ece4' : 'none', border: '1px solid rgba(240,236,228,0.18)', padding: '9px 18px', cursor: 'pointer', transition: 'all 0.25s' }}>
          Bag ({count})
        </button>
      </div>
    </header>
  )
}
