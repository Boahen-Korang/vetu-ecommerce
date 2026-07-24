import { useState, useEffect, type CSSProperties } from 'react'
import { navigate } from './router'
import {
  loadUploaded, addProduct, removeProduct, formatPrice, slugify,
  type Product, type Category,
} from './products'
import { isAdminAuthed, adminLogin, adminLogout } from './adminAuth'
import { useMediaQuery } from './useMediaQuery'

const CATS: Category[] = ['Outerwear', 'Knitwear', 'Tailoring', 'Dresses']
const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL']
const GOLD = '#c9b99a'

// Downscale an uploaded image to keep localStorage small (~50–120 KB/item).
function fileToDataUrl(file: File, maxW = 700): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.onload = () => {
      const im = new Image()
      im.onerror = () => reject(new Error('Could not load image'))
      im.onload = () => {
        const scale = Math.min(1, maxW / im.width)
        const w = Math.round(im.width * scale)
        const h = Math.round(im.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d')!.drawImage(im, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      im.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

const inputStyle: CSSProperties = {
  width: '100%', boxSizing: 'border-box', fontFamily: "'DM Mono',monospace",
  fontSize: 12, letterSpacing: '0.06em', color: '#f0ece4',
  background: 'rgba(240,236,228,0.04)', border: '1px solid rgba(240,236,228,0.12)',
  padding: '12px 14px', outline: 'none',
}
const labelStyle: CSSProperties = {
  display: 'block', fontFamily: "'DM Mono',monospace", fontSize: 9,
  letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD, marginBottom: 8,
}

function AdminConsole({ onLogout }: { onLogout: () => void }) {
  const [name, setName] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState<Category>('Outerwear')
  const [tag, setTag] = useState('')
  const [sizes, setSizes] = useState<string[]>([...ALL_SIZES])
  const [image, setImage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [items, setItems] = useState<Product[]>([])
  const stack = useMediaQuery('(max-width: 820px)')

  useEffect(() => { setItems(loadUploaded()) }, [])

  const toggleSize = (s: string) =>
    setSizes(cur => cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s])

  const onFile = async (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please choose an image file.'); return }
    setError('')
    try {
      setImage(await fileToDataUrl(file))
    } catch {
      setError('Could not process that image.')
    }
  }

  const reset = () => {
    setName(''); setSubtitle(''); setPrice(''); setTag(''); setImage('')
    setSizes([...ALL_SIZES])
  }

  const submit = () => {
    setError(''); setOk('')
    const priceNum = parseFloat(price)
    if (!name.trim()) return setError('Name is required.')
    if (!(priceNum > 0)) return setError('Enter a price greater than 0.')
    if (!image) return setError('Add a product image (upload a file or paste an image URL).')
    if (sizes.length === 0) return setError('Select at least one size.')

    const product: Product = {
      id: slugify(name) + '-' + Date.now().toString(36),
      name: name.trim(),
      subtitle: subtitle.trim() || category,
      price: Math.round(priceNum),
      category,
      tag: (tag.trim() || category).toUpperCase(),
      img: image,
      alt: name.trim(),
      sizes: ALL_SIZES.filter(s => sizes.includes(s)),
    }
    setBusy(true)
    try {
      addProduct(product)
      setItems(loadUploaded())
      setOk(`“${product.name}” is now live in the shop.`)
      reset()
    } catch {
      setError('Storage is full — remove some uploaded pieces or use smaller images.')
    } finally {
      setBusy(false)
    }
  }

  const del = (id: string) => {
    removeProduct(id)
    setItems(loadUploaded())
  }

  const previewPrice = parseFloat(price) > 0 ? formatPrice(Math.round(parseFloat(price))) : '$0'

  return (
    <div style={{ background: '#060606', minHeight: '100vh', color: '#f0ece4', cursor: 'auto', fontFamily: "'DM Sans',sans-serif" }}>
      {/* Header */}
      <header style={{ height: 72, padding: '0 clamp(20px,5vw,56px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(240,236,228,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <a href="/" onClick={e => { e.preventDefault(); navigate('/') }} className="font-display" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.25em', color: '#f0ece4', textDecoration: 'none' }}>VÊTU</a>
          <span className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD }}>Admin</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <button onClick={onLogout} className="font-mono-dm" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.5)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f0ece4')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,236,228,0.5)')}>Log out</button>
          <button onClick={() => navigate('/shop')} className="font-mono-dm" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#060606', background: '#f0ece4', border: 'none', padding: '9px 20px', cursor: 'pointer' }}>View shop →</button>
        </div>
      </header>

      <div style={{ padding: 'clamp(28px,5vw,56px)', maxWidth: 1180, margin: '0 auto' }}>
        <p className="font-mono-dm" style={{ fontSize: 10, letterSpacing: '0.24em', color: GOLD, textTransform: 'uppercase', marginBottom: 14 }}>— Upload a piece</p>
        <h1 className="font-display" style={{ fontSize: 'clamp(34px, 5vw, 60px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 48 }}>List new clothing for sale</h1>

        <div style={{ display: 'grid', gridTemplateColumns: stack ? '1fr' : 'minmax(0,1fr) 320px', gap: stack ? 32 : 48, alignItems: 'start' }}>
          {/* ── Form ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div>
              <label style={labelStyle}>Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="The Overcoat" style={inputStyle} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <div>
                <label style={labelStyle}>Colour / descriptor</label>
                <input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Obsidian" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Price (USD) *</label>
                <input value={price} onChange={e => setPrice(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="1240" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <div>
                <label style={labelStyle}>Category</label>
                <select value={category} onChange={e => setCategory(e.target.value as Category)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {CATS.map(c => <option key={c} value={c} style={{ background: '#111' }}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Tag (badge)</label>
                <input value={tag} onChange={e => setTag(e.target.value)} placeholder={category.toUpperCase()} style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Sizes</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {ALL_SIZES.map(s => {
                  const on = sizes.includes(s)
                  return (
                    <button key={s} onClick={() => toggleSize(s)} className="font-mono-dm"
                      style={{ fontSize: 10, letterSpacing: '0.1em', color: on ? '#060606' : 'rgba(240,236,228,0.5)', background: on ? '#f0ece4' : 'transparent', border: `1px solid ${on ? '#f0ece4' : 'rgba(240,236,228,0.14)'}`, padding: '9px 13px', cursor: 'pointer', minWidth: 42, transition: 'all 0.2s' }}>{s}</button>
                  )
                })}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Image *</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input type="file" accept="image/*" onChange={e => onFile(e.target.files?.[0])}
                  className="font-mono-dm" style={{ ...inputStyle, padding: 10, fontSize: 11, cursor: 'pointer' }} />
                <input value={image.startsWith('data:') ? '' : image} onChange={e => setImage(e.target.value)}
                  placeholder="…or paste an image URL" style={inputStyle} />
              </div>
            </div>

            {error && <p className="font-mono-dm" style={{ fontSize: 12, color: '#cf6b52', margin: 0 }}>{error}</p>}
            {ok && <p className="font-mono-dm" style={{ fontSize: 12, letterSpacing: '0.06em', color: GOLD, margin: 0 }}>{ok}</p>}

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={submit} disabled={busy} className="font-mono-dm"
                style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#060606', background: '#f0ece4', border: 'none', padding: '15px 34px', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
                {busy ? 'Saving…' : 'Add piece'}
              </button>
              <button onClick={reset} className="font-mono-dm"
                style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.5)', background: 'none', border: '1px solid rgba(240,236,228,0.14)', padding: '15px 26px', cursor: 'pointer' }}>
                Clear
              </button>
            </div>
          </div>

          {/* ── Live preview ── */}
          <div style={{ position: stack ? 'static' : 'sticky', top: 96, maxWidth: stack ? 300 : undefined }}>
            <p style={labelStyle}>Preview</p>
            <div style={{ position: 'relative', aspectRatio: '7 / 9', background: '#0e0e0e', overflow: 'hidden', marginBottom: 16, border: '1px solid rgba(240,236,228,0.06)' }}>
              {image ? (
                <img src={image} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.88) saturate(0.85)' }} />
              ) : (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="font-mono-dm" style={{ fontSize: 10, letterSpacing: '0.16em', color: 'rgba(240,236,228,0.25)', textTransform: 'uppercase' }}>No image</span>
                </div>
              )}
              <div style={{ position: 'absolute', top: 16, left: 16 }}>
                <span className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.6)', background: 'rgba(6,6,6,0.6)', padding: '5px 10px' }}>{(tag.trim() || category).toUpperCase()}</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.16em', color: GOLD, textTransform: 'uppercase', marginBottom: 5 }}>{subtitle.trim() || category}</p>
                <h3 className="font-display" style={{ fontSize: 20, fontWeight: 600, color: '#f0ece4' }}>{name.trim() || 'Untitled piece'}</h3>
              </div>
              <span className="font-mono-dm" style={{ fontSize: 12, color: 'rgba(240,236,228,0.45)', paddingTop: 2 }}>{previewPrice}</span>
            </div>
          </div>
        </div>

        {/* ── Uploaded pieces ── */}
        <div style={{ marginTop: 72, borderTop: '1px solid rgba(240,236,228,0.08)', paddingTop: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 28 }}>
            <h2 className="font-display" style={{ fontSize: 26, fontWeight: 600 }}>Uploaded pieces</h2>
            <span className="font-mono-dm" style={{ fontSize: 10, letterSpacing: '0.14em', color: 'rgba(240,236,228,0.4)', textTransform: 'uppercase' }}>{items.length} live</span>
          </div>
          {items.length === 0 ? (
            <p className="font-mono-dm" style={{ fontSize: 12, letterSpacing: '0.06em', color: 'rgba(240,236,228,0.4)' }}>
              Nothing uploaded yet. Added pieces appear here and in the shop alongside the default collection.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {items.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 18, padding: 12, border: '1px solid rgba(240,236,228,0.08)' }}>
                  <img src={p.img} alt={p.alt} style={{ width: 52, height: 66, objectFit: 'cover', background: '#0e0e0e', flex: 'none' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="font-display" style={{ fontSize: 17, fontWeight: 600, color: '#f0ece4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                    <p className="font-mono-dm" style={{ fontSize: 10, letterSpacing: '0.1em', color: 'rgba(240,236,228,0.4)', textTransform: 'uppercase', marginTop: 3 }}>{p.category} · {p.sizes.join(' ')}</p>
                  </div>
                  <span className="font-mono-dm" style={{ fontSize: 12, color: GOLD }}>{formatPrice(p.price)}</span>
                  <button onClick={() => del(p.id)} className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.5)', background: 'none', border: '1px solid rgba(240,236,228,0.14)', padding: '9px 14px', cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#cf6b52'; e.currentTarget.style.borderColor = 'rgba(207,107,82,0.5)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(240,236,228,0.5)'; e.currentTarget.style.borderColor = 'rgba(240,236,228,0.14)' }}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Login gate ──────────────────────────────────────────────────────────────
function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')

  const submit = () => {
    if (adminLogin(pw)) onSuccess()
    else { setErr('Incorrect passcode.'); setPw('') }
  }

  return (
    <div style={{ background: '#060606', minHeight: '100vh', color: '#f0ece4', cursor: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans',sans-serif", padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, justifyContent: 'center', marginBottom: 10 }}>
          <span className="font-display" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '0.22em' }}>VÊTU</span>
          <span className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD }}>Admin</span>
        </div>
        <p className="font-mono-dm" style={{ fontSize: 11, letterSpacing: '0.06em', color: 'rgba(240,236,228,0.5)', textAlign: 'center', margin: '0 0 32px' }}>
          Enter the admin passcode to manage products.
        </p>
        <label style={labelStyle}>Passcode</label>
        <input type="password" value={pw} autoFocus
          onChange={e => { setPw(e.target.value); if (err) setErr('') }}
          onKeyDown={e => { if (e.key === 'Enter') submit() }}
          placeholder="••••••••" style={inputStyle} />
        <div style={{ minHeight: 20, paddingTop: 6 }}>
          {err && <span className="font-mono-dm" style={{ fontSize: 12, color: '#cf6b52' }}>{err}</span>}
        </div>
        <button onClick={submit} className="font-mono-dm" style={{ width: '100%', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#060606', background: '#f0ece4', border: 'none', padding: 14, cursor: 'pointer', marginTop: 8 }}>Enter</button>
        <button onClick={() => navigate('/')} className="font-mono-dm" style={{ width: '100%', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.4)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 18 }}>← Back to site</button>
      </div>
    </div>
  )
}

// ─── Gated entry ─────────────────────────────────────────────────────────────
export default function Admin() {
  const [authed, setAuthed] = useState(() => isAdminAuthed())

  useEffect(() => {
    const prev = document.body.style.cursor
    document.body.style.cursor = 'auto'
    return () => { document.body.style.cursor = prev }
  }, [])

  if (!authed) return <AdminLogin onSuccess={() => setAuthed(true)} />
  return <AdminConsole onLogout={() => { adminLogout(); setAuthed(false) }} />
}
