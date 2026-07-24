import { useState, useEffect, useMemo, useRef } from 'react'
import { navigate } from './router'
import { loadProducts, formatPrice, CATEGORIES, type Filter, type Product } from './products'
import { addToCart } from './cart'
import SiteHeader from './SiteHeader'

// ─── Product card ────────────────────────────────────────────────────────────
function ProductCard({ product, added, onAdd }: { product: Product; added: boolean; onAdd: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', aspectRatio: '7 / 9', background: '#0e0e0e', overflow: 'hidden', marginBottom: 18 }}>
        <img src={product.img} alt={product.alt}
          style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.88) saturate(0.85)', transform: hovered ? 'scale(1.05)' : 'scale(1)', transition: 'transform 0.9s cubic-bezier(0.16,1,0.3,1)' }} />
        <div style={{ position: 'absolute', top: 18, left: 18 }}>
          <span className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.6)', background: 'rgba(6,6,6,0.6)', padding: '5px 10px', backdropFilter: 'blur(8px)' }}>{product.tag}</span>
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 18, background: 'linear-gradient(to top, rgba(6,6,6,0.92) 0%, transparent 100%)', transform: hovered || added ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
          <button onClick={onAdd} className="font-mono-dm"
            style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#060606', background: added ? '#c9b99a' : '#f0ece4', border: 'none', padding: '11px 24px', cursor: 'pointer', width: '100%', transition: 'background 0.25s' }}>
            {added ? 'Added to Bag ✓' : `Quick Add — ${formatPrice(product.price)}`}
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.16em', color: '#c9b99a', textTransform: 'uppercase', marginBottom: 5 }}>{product.subtitle}</p>
          <h3 className="font-display" style={{ fontSize: 20, fontWeight: 600, color: '#f0ece4', letterSpacing: '-0.01em' }}>{product.name}</h3>
        </div>
        <span className="font-mono-dm" style={{ fontSize: 12, color: 'rgba(240,236,228,0.45)', paddingTop: 2 }}>{formatPrice(product.price)}</span>
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function Shop() {
  const products = useMemo(() => loadProducts(), [])
  const initialFilter = useMemo<Filter>(() => {
    const q = new URLSearchParams(window.location.search).get('category')
    return (CATEGORIES as readonly string[]).includes(q || '') ? (q as Filter) : 'All'
  }, [])

  const [filter, setFilter] = useState<Filter>(initialFilter)
  const [added, setAdded] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    const prev = document.body.style.cursor
    document.body.style.cursor = 'auto'
    return () => {
      document.body.style.cursor = prev
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  const visible = filter === 'All' ? products : products.filter(p => p.category === filter)

  const add = (p: Product) => {
    addToCart(p, p.sizes[0] || 'One size', 1)
    setAdded(a => ({ ...a, [p.id]: true }))
    setTimeout(() => setAdded(a => ({ ...a, [p.id]: false })), 1400)
    setToast(p.name)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 4000)
  }

  return (
    <div style={{ background: '#060606', minHeight: '100vh', color: '#f0ece4', cursor: 'auto' }}>
      <SiteHeader active="shop" />

      <section style={{ padding: '80px clamp(20px,5vw,56px) 40px' }}>
        <p className="font-mono-dm" style={{ fontSize: 10, letterSpacing: '0.24em', color: '#c9b99a', textTransform: 'uppercase', marginBottom: 16 }}>— The Collection</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 20 }}>
          <h1 className="font-display" style={{ fontSize: 'clamp(40px, 6vw, 84px)', fontWeight: 700, lineHeight: 0.95, letterSpacing: '-0.025em', color: '#f0ece4', margin: 0 }}>Shop all pieces</h1>
          <span className="font-mono-dm" style={{ fontSize: 11, letterSpacing: '0.14em', color: 'rgba(240,236,228,0.4)', textTransform: 'uppercase' }}>{visible.length} {visible.length === 1 ? 'piece' : 'pieces'}</span>
        </div>
      </section>

      <div style={{ padding: '0 clamp(20px,5vw,56px) 28px', display: 'flex', gap: 10, flexWrap: 'wrap', borderBottom: '1px solid rgba(240,236,228,0.06)' }}>
        {CATEGORIES.map(c => {
          const activeC = filter === c
          return (
            <button key={c} onClick={() => setFilter(c)} className="font-mono-dm"
              style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: activeC ? '#060606' : 'rgba(240,236,228,0.55)', background: activeC ? '#f0ece4' : 'transparent', border: `1px solid ${activeC ? '#f0ece4' : 'rgba(240,236,228,0.14)'}`, padding: '10px 20px', cursor: 'pointer', transition: 'all 0.25s' }}
              onMouseEnter={e => { if (!activeC) { e.currentTarget.style.color = '#f0ece4'; e.currentTarget.style.borderColor = 'rgba(240,236,228,0.3)' } }}
              onMouseLeave={e => { if (!activeC) { e.currentTarget.style.color = 'rgba(240,236,228,0.55)'; e.currentTarget.style.borderColor = 'rgba(240,236,228,0.14)' } }}>
              {c}
            </button>
          )
        })}
      </div>

      <section style={{ padding: '48px clamp(20px,5vw,56px) 120px' }}>
        {visible.length === 0 ? (
          <div style={{ padding: '80px 0', textAlign: 'center' }}>
            <p className="font-display" style={{ fontSize: 28, color: '#f0ece4', fontStyle: 'italic', marginBottom: 12 }}>Nothing here yet.</p>
            <p className="font-mono-dm" style={{ fontSize: 11, letterSpacing: '0.14em', color: 'rgba(240,236,228,0.4)', textTransform: 'uppercase' }}>No pieces in this category.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {visible.map(p => (
              <ProductCard key={p.id} product={p} added={!!added[p.id]} onAdd={() => add(p)} />
            ))}
          </div>
        )}
      </section>

      <footer style={{ padding: '40px clamp(20px,5vw,56px)', background: '#040404', borderTop: '1px solid rgba(240,236,228,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <p className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.14em', color: 'rgba(240,236,228,0.18)', textTransform: 'uppercase', margin: 0 }}>© 2026 Vêtu Ltd.</p>
        <button onClick={() => navigate('/')} className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>← Back to home</button>
      </footer>

      {/* Add-to-bag confirmation → guides the shopper to checkout */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 600, display: 'flex', alignItems: 'center', gap: 18, maxWidth: 'calc(100vw - 32px)', background: 'rgba(12,11,10,0.92)', backdropFilter: 'blur(16px)', border: '1px solid rgba(240,236,228,0.15)', padding: '13px 16px 13px 20px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', animation: 'rise .3s ease' }}>
          <div style={{ minWidth: 0 }}>
            <span className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#c9b99a', marginRight: 10 }}>Added ✓</span>
            <span style={{ fontSize: 13, color: '#f0ece4' }}>{toast}</span>
          </div>
          <button onClick={() => navigate('/cart')} className="font-mono-dm" style={{ flex: 'none', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#060606', background: '#f0ece4', border: 'none', padding: '10px 16px', cursor: 'pointer' }}>View bag & checkout →</button>
        </div>
      )}
    </div>
  )
}
