import { useState, useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { navigate } from './router'
import { loadProducts, formatPrice, CATEGORIES, type Filter, type Product } from './products'
import { addToCart } from './cart'
import { useMediaQuery } from './useMediaQuery'
import SiteHeader from './SiteHeader'

const GOLD = '#c9b99a'
const GOLD_BRIGHT = '#d4af7a'
const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL']

type Sort = 'featured' | 'price-asc' | 'price-desc' | 'rating' | 'name'
type PriceBucket = 'any' | 'u300' | '300-600' | '600-1000' | 'o1000'

const PRICE_BUCKETS: { id: PriceBucket; label: string; test: (n: number) => boolean }[] = [
  { id: 'any', label: 'Any price', test: () => true },
  { id: 'u300', label: 'Under ₵300', test: n => n < 300 },
  { id: '300-600', label: '₵300 – ₵600', test: n => n >= 300 && n <= 600 },
  { id: '600-1000', label: '₵600 – ₵1,000', test: n => n > 600 && n <= 1000 },
  { id: 'o1000', label: 'Over ₵1,000', test: n => n > 1000 },
]

// Deterministic pseudo rating/reviews from the product id (stable per product).
function rate(id: string): { rating: number; reviews: number } {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return { rating: Math.round((Math.min(5, 3.6 + (h % 15) / 10)) * 10) / 10, reviews: 24 + (h % 476) }
}

function Stars({ value }: { value: number }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block', fontSize: 13, letterSpacing: 1, color: 'rgba(240,236,228,0.22)', lineHeight: 1 }}>
      ★★★★★
      <span style={{ position: 'absolute', left: 0, top: 0, overflow: 'hidden', whiteSpace: 'nowrap', width: `${(value / 5) * 100}%`, color: GOLD_BRIGHT }}>★★★★★</span>
    </span>
  )
}

// ─── Product card (Amazon-style) ─────────────────────────────────────────────
function ProductCard({ product, added, onAdd }: { product: Product; added: boolean; onAdd: () => void }) {
  const [hovered, setHovered] = useState(false)
  const { rating, reviews } = rate(product.id)
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ display: 'flex', flexDirection: 'column', background: '#0d0d0d', border: '1px solid rgba(240,236,228,0.07)', padding: 14 }}>
      <div style={{ position: 'relative', aspectRatio: '4 / 5', background: '#161616', overflow: 'hidden', marginBottom: 14 }}>
        <img src={product.img} alt={product.alt}
          style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.9) saturate(0.85)', transform: hovered ? 'scale(1.04)' : 'scale(1)', transition: 'transform 0.7s cubic-bezier(0.16,1,0.3,1)' }} />
        <span className="font-mono-dm" style={{ position: 'absolute', top: 12, left: 12, fontSize: 8.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.7)', background: 'rgba(6,6,6,0.6)', padding: '4px 8px', backdropFilter: 'blur(8px)' }}>{product.tag}</span>
      </div>

      <p className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.14em', color: GOLD, textTransform: 'uppercase', margin: '0 0 5px' }}>{product.subtitle}</p>
      <h3 className="font-display" style={{ fontSize: 17, fontWeight: 600, color: '#f0ece4', letterSpacing: '-0.01em', lineHeight: 1.2, margin: '0 0 8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 40 }}>{product.name}</h3>

      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <Stars value={rating} />
        <span className="font-mono-dm" style={{ fontSize: 11, color: GOLD_BRIGHT }}>{rating.toFixed(1)}</span>
        <span className="font-mono-dm" style={{ fontSize: 11, color: 'rgba(240,236,228,0.35)' }}>({reviews})</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
        <span className="font-display" style={{ fontSize: 22, fontWeight: 700, color: '#f0ece4' }}>{formatPrice(product.price)}</span>
        <span className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.12em', color: '#7fae7f', textTransform: 'uppercase' }}>In stock</span>
      </div>

      <button onClick={onAdd} className="font-mono-dm"
        style={{ marginTop: 'auto', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#060606', background: added ? GOLD : GOLD_BRIGHT, border: 'none', borderRadius: 999, padding: '11px 18px', cursor: 'pointer', width: '100%', transition: 'background 0.25s' }}
        onMouseEnter={e => { if (!added) e.currentTarget.style.background = GOLD }}
        onMouseLeave={e => { if (!added) e.currentTarget.style.background = GOLD_BRIGHT }}>
        {added ? 'Added to Bag ✓' : 'Add to Cart'}
      </button>
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

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<Filter>(initialFilter)
  const [price, setPrice] = useState<PriceBucket>('any')
  const [sizes, setSizes] = useState<string[]>([])
  const [minRating, setMinRating] = useState(0)
  const [sort, setSort] = useState<Sort>('featured')
  const [showFilters, setShowFilters] = useState(false)

  const [added, setAdded] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const isPhone = useMediaQuery('(max-width: 560px)')
  const isTablet = useMediaQuery('(max-width: 900px)')
  const cols = isPhone ? 2 : isTablet ? 3 : 4

  useEffect(() => {
    const prev = document.body.style.cursor
    document.body.style.cursor = 'auto'
    return () => {
      document.body.style.cursor = prev
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  const results = useMemo(() => {
    const q = search.trim().toLowerCase()
    const bucket = PRICE_BUCKETS.find(b => b.id === price)!
    let list = products.filter(p => {
      if (q && !(`${p.name} ${p.subtitle} ${p.tag} ${p.category}`.toLowerCase().includes(q))) return false
      if (category !== 'All' && p.category !== category) return false
      if (!bucket.test(p.price)) return false
      if (sizes.length && !p.sizes.some(s => sizes.includes(s))) return false
      if (minRating && rate(p.id).rating < minRating) return false
      return true
    })
    if (sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price)
    else if (sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price)
    else if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    else if (sort === 'rating') list = [...list].sort((a, b) => rate(b.id).rating - rate(a.id).rating)
    return list
  }, [products, search, category, price, sizes, minRating, sort])

  const add = (p: Product) => {
    addToCart(p, p.sizes[0] || 'One size', 1)
    setAdded(a => ({ ...a, [p.id]: true }))
    setTimeout(() => setAdded(a => ({ ...a, [p.id]: false })), 1400)
    setToast(p.name)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 4000)
  }

  const clearAll = () => { setSearch(''); setCategory('All'); setPrice('any'); setSizes([]); setMinRating(0) }
  const toggleSize = (s: string) => setSizes(cur => cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s])

  // ── Filter sidebar (shared desktop column / mobile panel) ──
  const secTitle: CSSProperties = { fontFamily: "'DM Mono',monospace", fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD, margin: '0 0 12px' }
  const optRow = (label: string, on: boolean, onClick: () => void) => (
    <button key={label} onClick={onClick} className="font-mono-dm"
      style={{ display: 'block', width: '100%', textAlign: 'left', fontSize: 12, letterSpacing: '0.02em', color: on ? '#f0ece4' : 'rgba(240,236,228,0.5)', background: 'none', border: 'none', padding: '6px 0', cursor: 'pointer' }}>
      <span style={{ color: on ? GOLD_BRIGHT : 'rgba(240,236,228,0.3)', marginRight: 8 }}>{on ? '●' : '○'}</span>{label}
    </button>
  )

  const Filters = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
      <div>
        <p style={secTitle}>Category</p>
        {CATEGORIES.map(c => optRow(c, category === c, () => setCategory(c)))}
      </div>
      <div>
        <p style={secTitle}>Price</p>
        {PRICE_BUCKETS.map(b => optRow(b.label, price === b.id, () => setPrice(b.id)))}
      </div>
      <div>
        <p style={secTitle}>Size</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {ALL_SIZES.map(s => {
            const on = sizes.includes(s)
            return (
              <button key={s} onClick={() => toggleSize(s)} className="font-mono-dm"
                style={{ fontSize: 11, letterSpacing: '0.06em', color: on ? '#060606' : 'rgba(240,236,228,0.55)', background: on ? '#f0ece4' : 'transparent', border: `1px solid ${on ? '#f0ece4' : 'rgba(240,236,228,0.16)'}`, padding: '7px 11px', cursor: 'pointer', minWidth: 40, transition: 'all 0.2s' }}>{s}</button>
            )
          })}
        </div>
      </div>
      <div>
        <p style={secTitle}>Customer rating</p>
        {[{ v: 0, l: 'Any rating' }, { v: 4, l: '4.0 & up' }, { v: 4.5, l: '4.5 & up' }].map(r => optRow(r.l, minRating === r.v, () => setMinRating(r.v)))}
      </div>
      <button onClick={clearAll} className="font-mono-dm" style={{ alignSelf: 'flex-start', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.5)', background: 'none', border: '1px solid rgba(240,236,228,0.14)', padding: '9px 16px', cursor: 'pointer' }}>Clear filters</button>
    </div>
  )

  const inputStyle: CSSProperties = { flex: 1, minWidth: 0, fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: '#f0ece4', background: 'rgba(240,236,228,0.05)', border: '1px solid rgba(240,236,228,0.14)', padding: '11px 14px', outline: 'none' }
  const selectStyle: CSSProperties = { fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: '0.06em', color: '#f0ece4', background: '#0d0d0d', border: '1px solid rgba(240,236,228,0.14)', padding: '10px 12px', cursor: 'pointer', outline: 'none' }

  return (
    <div style={{ background: '#060606', minHeight: '100vh', color: '#f0ece4', cursor: 'auto' }}>
      <SiteHeader active="shop" />

      {/* Search + sort toolbar */}
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '28px clamp(16px,4vw,40px) 0' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flex: '1 1 280px', minWidth: 0 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search the collection" style={inputStyle} />
            <button className="font-mono-dm" onClick={() => { /* live filter already applied */ }} aria-label="Search"
              style={{ flex: 'none', fontSize: 13, color: '#060606', background: GOLD_BRIGHT, border: 'none', padding: '0 16px', cursor: 'pointer' }}>⌕</button>
          </div>
          {isTablet && (
            <button onClick={() => setShowFilters(v => !v)} className="font-mono-dm" style={{ ...selectStyle }}>
              {showFilters ? 'Hide filters' : 'Filters'}
            </button>
          )}
          <select value={sort} onChange={e => setSort(e.target.value as Sort)} style={selectStyle}>
            <option value="featured">Sort: Featured</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rating">Avg. customer review</option>
            <option value="name">Name: A–Z</option>
          </select>
        </div>
        <p className="font-mono-dm" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'rgba(240,236,228,0.45)', margin: '16px 0 0' }}>
          {results.length} {results.length === 1 ? 'result' : 'results'}{category !== 'All' ? ` in ${category}` : ''}{search.trim() ? ` for “${search.trim()}”` : ''}
        </p>
      </div>

      {/* Sidebar + results */}
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '24px clamp(16px,4vw,40px) 100px', display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '230px 1fr', gap: isTablet ? 20 : 36, alignItems: 'start' }}>
        {!isTablet ? (
          <aside style={{ position: 'sticky', top: 92, borderRight: '1px solid rgba(240,236,228,0.07)', paddingRight: 28 }}><Filters /></aside>
        ) : showFilters ? (
          <div style={{ border: '1px solid rgba(240,236,228,0.09)', padding: 20 }}><Filters /></div>
        ) : null}

        <main>
          {results.length === 0 ? (
            <div style={{ padding: '80px 0', textAlign: 'center' }}>
              <p className="font-display" style={{ fontSize: 26, color: '#f0ece4', fontStyle: 'italic', marginBottom: 12 }}>No results.</p>
              <p className="font-mono-dm" style={{ fontSize: 11, letterSpacing: '0.14em', color: 'rgba(240,236,228,0.4)', textTransform: 'uppercase', marginBottom: 22 }}>Try clearing filters or a different search.</p>
              <button onClick={clearAll} className="font-mono-dm" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#060606', background: '#f0ece4', border: 'none', padding: '12px 24px', cursor: 'pointer' }}>Clear filters</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 'clamp(12px,2vw,18px)' }}>
              {results.map(p => (
                <ProductCard key={p.id} product={p} added={!!added[p.id]} onAdd={() => add(p)} />
              ))}
            </div>
          )}
        </main>
      </div>

      <footer style={{ padding: '40px clamp(20px,5vw,56px)', background: '#040404', borderTop: '1px solid rgba(240,236,228,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <p className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.14em', color: 'rgba(240,236,228,0.18)', textTransform: 'uppercase', margin: 0 }}>© 2026 Vêtu Ltd.</p>
        <button onClick={() => navigate('/')} className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>← Back to home</button>
      </footer>

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
