import { useState, useEffect, useMemo, type CSSProperties } from 'react'
import { navigate } from './router'
import {
  loadProducts, loadUploaded, addProduct, removeProduct, formatPrice, slugify,
  type Product, type Category,
} from './products'
import { loadOrders, type Order } from './orders'
import { isAdminAuthed, adminLogin, adminLogout, adminPasscode } from './adminAuth'
import { useMediaQuery } from './useMediaQuery'

const GOLD = '#c9b99a'
const CATS: Category[] = ['Outerwear', 'Knitwear', 'Tailoring', 'Dresses']
const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL']

type Section = 'overview' | 'products' | 'orders' | 'settings'

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
        const w = Math.round(im.width * scale), h = Math.round(im.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d')!.drawImage(im, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      im.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

// ─── Shared styles ───────────────────────────────────────────────────────────
const inputStyle: CSSProperties = {
  width: '100%', boxSizing: 'border-box', fontFamily: "'DM Mono',monospace", fontSize: 12,
  letterSpacing: '0.06em', color: '#f0ece4', background: 'rgba(240,236,228,0.04)',
  border: '1px solid rgba(240,236,228,0.12)', padding: '11px 13px', outline: 'none',
}
const labelStyle: CSSProperties = {
  display: 'block', fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: '0.18em',
  textTransform: 'uppercase', color: GOLD, marginBottom: 8,
}
const panel: CSSProperties = { border: '1px solid rgba(240,236,228,0.09)', background: '#0b0b0b', padding: 'clamp(18px,3vw,26px)' }
const primaryBtn: CSSProperties = {
  fontFamily: "'DM Mono',monospace", fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase',
  color: '#060606', background: '#f0ece4', border: 'none', padding: '11px 20px', cursor: 'pointer',
}
const ghostBtn: CSSProperties = {
  fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
  color: 'rgba(240,236,228,0.6)', background: 'none', border: '1px solid rgba(240,236,228,0.16)', padding: '10px 16px', cursor: 'pointer',
}
const sectionTitle: CSSProperties = { fontFamily: "'Playfair Display',serif", fontSize: 'clamp(26px,4vw,38px)', fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 4px' }
const kicker: CSSProperties = { fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: GOLD, marginBottom: 12 }

// ─── Product add/edit form ───────────────────────────────────────────────────
function ProductForm({ editing, onDone, onCancel }: { editing: Product | null; onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState(editing?.name ?? '')
  const [subtitle, setSubtitle] = useState(editing?.subtitle ?? '')
  const [price, setPrice] = useState(editing ? String(editing.price) : '')
  const [category, setCategory] = useState<Category>(editing?.category ?? 'Outerwear')
  const [tag, setTag] = useState(editing?.tag ?? '')
  const [sizes, setSizes] = useState<string[]>(editing?.sizes?.length ? [...editing.sizes] : [...ALL_SIZES])
  const [image, setImage] = useState(editing?.img ?? '')
  const [error, setError] = useState('')
  const stack = useMediaQuery('(max-width: 720px)')

  const toggleSize = (s: string) => setSizes(cur => cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s])
  const onFile = async (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please choose an image file.'); return }
    setError('')
    try { setImage(await fileToDataUrl(file)) } catch { setError('Could not process that image.') }
  }
  const submit = () => {
    setError('')
    const priceNum = parseFloat(price)
    if (!name.trim()) return setError('Name is required.')
    if (!(priceNum > 0)) return setError('Enter a price greater than 0.')
    if (!image) return setError('Add a product image (upload a file or paste an image URL).')
    if (sizes.length === 0) return setError('Select at least one size.')
    const product: Product = {
      id: editing ? editing.id : slugify(name) + '-' + Date.now().toString(36),
      name: name.trim(), subtitle: subtitle.trim() || category, price: Math.round(priceNum),
      category, tag: (tag.trim() || category).toUpperCase(), img: image, alt: name.trim(),
      sizes: ALL_SIZES.filter(s => sizes.includes(s)),
    }
    try { addProduct(product); onDone() }
    catch { setError('Storage is full — remove some uploaded pieces or use smaller images.') }
  }

  return (
    <div style={{ ...panel, marginBottom: 24, display: 'grid', gridTemplateColumns: stack ? '1fr' : 'minmax(0,1fr) 200px', gap: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ ...kicker, marginBottom: 0 }}>{editing ? 'Edit piece' : 'Add a piece'}</p>
        <div><label style={labelStyle}>Name *</label><input value={name} onChange={e => setName(e.target.value)} placeholder="The Overcoat" style={inputStyle} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div><label style={labelStyle}>Colour / descriptor</label><input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Obsidian" style={inputStyle} /></div>
          <div><label style={labelStyle}>Price *</label><input value={price} onChange={e => setPrice(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="1240" style={inputStyle} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div><label style={labelStyle}>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value as Category)} style={{ ...inputStyle, cursor: 'pointer' }}>
              {CATS.map(c => <option key={c} value={c} style={{ background: '#111' }}>{c}</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>Tag</label><input value={tag} onChange={e => setTag(e.target.value)} placeholder={category.toUpperCase()} style={inputStyle} /></div>
        </div>
        <div>
          <label style={labelStyle}>Sizes</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {ALL_SIZES.map(s => {
              const on = sizes.includes(s)
              return <button key={s} onClick={() => toggleSize(s)} className="font-mono-dm" style={{ fontSize: 10, letterSpacing: '0.1em', color: on ? '#060606' : 'rgba(240,236,228,0.5)', background: on ? '#f0ece4' : 'transparent', border: `1px solid ${on ? '#f0ece4' : 'rgba(240,236,228,0.14)'}`, padding: '8px 12px', cursor: 'pointer', minWidth: 40 }}>{s}</button>
            })}
          </div>
        </div>
        <div>
          <label style={labelStyle}>Image *</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input type="file" accept="image/*" onChange={e => onFile(e.target.files?.[0])} className="font-mono-dm" style={{ ...inputStyle, padding: 9, fontSize: 11, cursor: 'pointer' }} />
            <input value={image.startsWith('data:') ? '' : image} onChange={e => setImage(e.target.value)} placeholder="…or paste an image URL" style={inputStyle} />
          </div>
        </div>
        {error && <p className="font-mono-dm" style={{ fontSize: 12, color: '#cf6b52', margin: 0 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={submit} style={primaryBtn}>{editing ? 'Save changes' : 'Add piece'}</button>
          <button onClick={onCancel} style={ghostBtn}>Cancel</button>
        </div>
      </div>
      <div>
        <p style={labelStyle}>Preview</p>
        <div style={{ position: 'relative', aspectRatio: '7 / 9', background: '#0e0e0e', overflow: 'hidden', border: '1px solid rgba(240,236,228,0.06)' }}>
          {image
            ? <img src={image} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.88) saturate(0.85)' }} />
            : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="font-mono-dm" style={{ fontSize: 10, letterSpacing: '0.16em', color: 'rgba(240,236,228,0.25)', textTransform: 'uppercase' }}>No image</span></div>}
        </div>
        <h3 className="font-display" style={{ fontSize: 17, fontWeight: 600, color: '#f0ece4', margin: '12px 0 2px' }}>{name.trim() || 'Untitled'}</h3>
        <p className="font-mono-dm" style={{ fontSize: 11, color: GOLD }}>{parseFloat(price) > 0 ? formatPrice(Math.round(parseFloat(price))) : '$0'}</p>
      </div>
    </div>
  )
}

// ─── Overview ────────────────────────────────────────────────────────────────
function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ ...panel, padding: 22 }}>
      <p className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.45)', margin: '0 0 12px' }}>{label}</p>
      <p className="font-display" style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>{value}</p>
      {sub && <p className="font-mono-dm" style={{ fontSize: 10, letterSpacing: '0.1em', color: GOLD, margin: '6px 0 0' }}>{sub}</p>}
    </div>
  )
}

function Overview({ go }: { go: (s: Section) => void }) {
  const products = loadProducts()
  const uploaded = loadUploaded()
  const orders = loadOrders()
  const paid = orders.filter(o => o.status === 'paid')
  const revenue = paid.reduce((s, o) => s + o.amount, 0)
  const catalogValue = products.reduce((s, p) => s + p.price, 0)
  const byCat = CATS.map(c => ({ c, n: products.filter(p => p.category === c).length }))

  return (
    <div>
      <p style={kicker}>— Dashboard</p>
      <h1 style={sectionTitle}>Overview</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,180px),1fr))', gap: 16, margin: '32px 0' }}>
        <StatTile label="Products" value={String(products.length)} sub={`${uploaded.length} uploaded · ${products.length - uploaded.length} default`} />
        <StatTile label="Paid orders" value={String(paid.length)} sub={`${orders.length} total`} />
        <StatTile label="Revenue (paid)" value={formatPrice(revenue)} />
        <StatTile label="Catalog value" value={formatPrice(catalogValue)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,280px),1fr))', gap: 16 }}>
        <div style={panel}>
          <p style={{ ...kicker, marginBottom: 18 }}>By category</p>
          {byCat.map(({ c, n }) => (
            <div key={c} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid rgba(240,236,228,0.06)' }}>
              <span style={{ fontSize: 13, color: 'rgba(240,236,228,0.7)' }}>{c}</span>
              <span className="font-mono-dm" style={{ fontSize: 12, color: GOLD }}>{n}</span>
            </div>
          ))}
        </div>
        <div style={panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
            <p style={{ ...kicker, marginBottom: 0 }}>Recent orders</p>
            {orders.length > 0 && <button onClick={() => go('orders')} className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>}
          </div>
          {orders.length === 0
            ? <p className="font-mono-dm" style={{ fontSize: 11, color: 'rgba(240,236,228,0.4)' }}>No orders yet.</p>
            : orders.slice(0, 5).map(o => (
              <div key={o.reference} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid rgba(240,236,228,0.06)', gap: 12 }}>
                <span style={{ fontSize: 12.5, color: 'rgba(240,236,228,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.email}</span>
                <span style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 'none' }}>
                  <span className="font-mono-dm" style={{ fontSize: 12, color: '#f0ece4' }}>{formatPrice(o.amount)}</span>
                  <StatusBadge status={o.status} />
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

// ─── Products ────────────────────────────────────────────────────────────────
function Products() {
  const [products, setProducts] = useState<Product[]>(() => loadProducts())
  const [uploadedIds, setUploadedIds] = useState<Set<string>>(() => new Set(loadUploaded().map(p => p.id)))
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<'All' | Category>('All')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)

  const refresh = () => { setProducts(loadProducts()); setUploadedIds(new Set(loadUploaded().map(p => p.id))) }
  const visible = useMemo(() => products.filter(p =>
    (cat === 'All' || p.category === cat) &&
    (p.name.toLowerCase().includes(q.toLowerCase()) || p.subtitle.toLowerCase().includes(q.toLowerCase()))
  ), [products, cat, q])

  const startAdd = () => { setEditing(null); setFormOpen(true) }
  const startEdit = (p: Product) => { setEditing(p); setFormOpen(true) }
  const done = () => { setFormOpen(false); setEditing(null); refresh() }

  return (
    <div>
      <p style={kicker}>— Catalog</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <h1 style={sectionTitle}>Products <span className="font-mono-dm" style={{ fontSize: 13, color: 'rgba(240,236,228,0.4)', letterSpacing: '0.1em' }}>({products.length})</span></h1>
        {!formOpen && <button onClick={startAdd} style={primaryBtn}>+ Add piece</button>}
      </div>

      {formOpen && <ProductForm key={editing?.id ?? 'new'} editing={editing} onDone={done} onCancel={() => { setFormOpen(false); setEditing(null) }} />}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search pieces…" style={{ ...inputStyle, width: 'min(100%,240px)' }} />
        <select value={cat} onChange={e => setCat(e.target.value as 'All' | Category)} style={{ ...inputStyle, width: 'auto', cursor: 'pointer' }}>
          {['All', ...CATS].map(c => <option key={c} value={c} style={{ background: '#111' }}>{c}</option>)}
        </select>
      </div>

      <div style={panel}>
        {visible.length === 0
          ? <p className="font-mono-dm" style={{ fontSize: 12, color: 'rgba(240,236,228,0.4)', padding: '20px 0' }}>No products match.</p>
          : visible.map(p => {
            const up = uploadedIds.has(p.id)
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', borderBottom: '1px solid rgba(240,236,228,0.06)', flexWrap: 'wrap' }}>
                <img src={p.img} alt={p.alt} style={{ width: 44, height: 56, objectFit: 'cover', background: '#0e0e0e', flex: 'none' }} />
                <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                  <p className="font-display" style={{ fontSize: 16, fontWeight: 600, color: '#f0ece4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                  <p className="font-mono-dm" style={{ fontSize: 10, letterSpacing: '0.08em', color: 'rgba(240,236,228,0.4)', textTransform: 'uppercase', marginTop: 3 }}>{p.category} · {p.subtitle}</p>
                </div>
                <span className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: up ? GOLD : 'rgba(240,236,228,0.35)', border: `1px solid ${up ? 'rgba(201,185,154,0.4)' : 'rgba(240,236,228,0.14)'}`, padding: '4px 8px' }}>{up ? 'Uploaded' : 'Default'}</span>
                <span className="font-mono-dm" style={{ fontSize: 12, color: '#f0ece4', minWidth: 64, textAlign: 'right' }}>{formatPrice(p.price)}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {up ? (
                    <>
                      <button onClick={() => startEdit(p)} className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.7)', background: 'none', border: '1px solid rgba(240,236,228,0.16)', padding: '7px 12px', cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => { removeProduct(p.id); refresh() }} className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.5)', background: 'none', border: '1px solid rgba(240,236,228,0.14)', padding: '7px 12px', cursor: 'pointer' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#cf6b52'; e.currentTarget.style.borderColor = 'rgba(207,107,82,0.5)' }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(240,236,228,0.5)'; e.currentTarget.style.borderColor = 'rgba(240,236,228,0.14)' }}>Remove</button>
                    </>
                  ) : <span className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.25)' }}>read-only</span>}
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}

// ─── Orders ──────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Order['status'] }) {
  const map = { paid: ['#7fae7f', 'Paid'], pending: [GOLD, 'Pending'], failed: ['#cf6b52', 'Failed'] } as const
  const [color, label] = map[status]
  return <span className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color, border: `1px solid ${color}55`, padding: '4px 8px' }}>{label}</span>
}

function Orders() {
  const [orders, setOrders] = useState<Order[]>(() => loadOrders())
  useEffect(() => { setOrders(loadOrders()) }, [])
  return (
    <div>
      <p style={kicker}>— Sales</p>
      <h1 style={sectionTitle}>Orders <span className="font-mono-dm" style={{ fontSize: 13, color: 'rgba(240,236,228,0.4)', letterSpacing: '0.1em' }}>({orders.length})</span></h1>
      <p className="font-mono-dm" style={{ fontSize: 10.5, letterSpacing: '0.04em', color: 'rgba(240,236,228,0.35)', lineHeight: 1.6, margin: '14px 0 28px' }}>
        Orders are stored in this browser. Orders placed by customers on other devices won&rsquo;t appear here — that needs a backend (Korapay webhook → database).
      </p>
      <div style={panel}>
        {orders.length === 0
          ? <p className="font-mono-dm" style={{ fontSize: 12, color: 'rgba(240,236,228,0.4)', padding: '20px 0' }}>No orders yet.</p>
          : orders.map(o => (
            <div key={o.reference} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0', borderBottom: '1px solid rgba(240,236,228,0.06)', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <p style={{ fontSize: 14, color: '#f0ece4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.email}</p>
                <p className="font-mono-dm" style={{ fontSize: 10, letterSpacing: '0.06em', color: 'rgba(240,236,228,0.4)', marginTop: 4 }}>
                  {new Date(o.createdAt).toLocaleDateString()} · {o.items.reduce((n, i) => n + i.qty, 0)} item(s) · {o.reference.slice(0, 16)}…
                </p>
              </div>
              <span className="font-mono-dm" style={{ fontSize: 13, color: '#f0ece4' }}>{formatPrice(o.amount)}</span>
              <StatusBadge status={o.status} />
            </div>
          ))}
      </div>
    </div>
  )
}

// ─── Settings: payment gateway manager ───────────────────────────────────────
type CustomGw = {
  id: string; label: string; configured?: boolean; last4?: string
  secretKey: string; publicKey: string
  currency: string; subunits: boolean; authHeader: string; authPrefix: string
  initUrl: string; bodyTemplate: string; checkoutUrlPath: string
  verifyUrl: string; verifyStatusPath: string; verifySuccessValue: string
}
type PublicConfig = { active: string; custom: Omit<CustomGw, 'secretKey'>[] }

const gwSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24)
const NEW_TEMPLATE = `{
  "amount": {{amount}},
  "currency": "{{currency}}",
  "reference": "{{reference}}",
  "customer": { "email": "{{email}}" },
  "redirect_url": "{{redirect_url}}"
}`
const blankCustom = (): CustomGw => ({
  id: '', label: '', secretKey: '', publicKey: '', currency: 'NGN', subunits: false,
  authHeader: 'Authorization', authPrefix: 'Bearer ', initUrl: '', bodyTemplate: NEW_TEMPLATE,
  checkoutUrlPath: 'data.checkout_url', verifyUrl: '', verifyStatusPath: 'data.status', verifySuccessValue: 'success',
})
const cid = (c: CustomGw) => c.id || gwSlug(c.label)

function GatewaySettings() {
  const [active, setActive] = useState('')
  const [custom, setCustom] = useState<CustomGw[]>([])
  const [adv, setAdv] = useState<Record<number, boolean>>({})
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const apply = (c: PublicConfig) => {
    setActive(c.active)
    setCustom((c.custom || []).map(x => ({ ...x, secretKey: '' })))
    setLoaded(true)
  }

  const load = () => {
    setLoading(true); setErr(''); setMsg('')
    fetch('/api/admin/gateways', { headers: { 'x-admin-passcode': adminPasscode() } })
      .then(async r => {
        if (r.status === 401) throw new Error('The server rejected the admin passcode. Set ADMIN_PASSCODE on the server to match your login passcode.')
        if (!r.ok) throw new Error('Could not load gateway settings.')
        return r.json()
      })
      .then(apply)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const patchCustom = (i: number, patch: Partial<CustomGw>) =>
    setCustom(list => list.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))

  const save = () => {
    setSaving(true); setMsg(''); setErr('')
    const customGateways = custom.filter(c => cid(c)).map(c => ({
      id: cid(c), label: c.label, publicKey: c.publicKey, currency: c.currency, subunits: c.subunits,
      authHeader: c.authHeader, authPrefix: c.authPrefix, initUrl: c.initUrl, bodyTemplate: c.bodyTemplate,
      checkoutUrlPath: c.checkoutUrlPath, verifyUrl: c.verifyUrl, verifyStatusPath: c.verifyStatusPath,
      verifySuccessValue: c.verifySuccessValue, ...(c.secretKey.trim() ? { secretKey: c.secretKey.trim() } : {}),
    }))
    fetch('/api/admin/gateways', {
      method: 'POST',
      headers: { 'x-admin-passcode': adminPasscode(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ active, customGateways }),
    })
      .then(async r => {
        if (r.status === 401) throw new Error('The server rejected the admin passcode (set ADMIN_PASSCODE on the server).')
        if (!r.ok) throw new Error('Could not save gateway settings.')
        return r.json()
      })
      .then((c: PublicConfig) => { apply(c); setMsg('Saved. Changes take effect immediately.') })
      .catch(e => setErr(e.message))
      .finally(() => setSaving(false))
  }

  if (loading && !loaded) return <p className="font-mono-dm" style={{ fontSize: 12, color: 'rgba(240,236,228,0.5)' }}>Loading gateways…</p>
  if (!loaded) return <p className="font-mono-dm" style={{ fontSize: 12, color: '#cf6b52', lineHeight: 1.6 }}>{err || 'Could not load gateways.'}</p>

  const cField = (label: string, value: string, on: (v: string) => void, ph = '', type = 'text') => (
    <div>
      <label style={labelStyle}>{label}</label>
      <input type={type} value={value} onChange={e => on(e.target.value)} placeholder={ph} style={inputStyle} />
    </div>
  )

  return (
    <div style={{ maxWidth: 620 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <p style={{ ...kicker, margin: 0 }}>— Gateways</p>
        <button onClick={() => setCustom(l => [...l, blankCustom()])} style={ghostBtn}>+ Add gateway</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {custom.map((c, i) => {
          const id = cid(c)
          const on = !!id && active === id
          const open = !!adv[i]
          return (
            <div key={i} style={{ ...panel, border: `1px solid ${on ? 'rgba(201,185,154,0.4)' : 'rgba(240,236,228,0.09)'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                <input type="radio" name="active-gateway" checked={on} onChange={() => id && setActive(id)} style={{ accentColor: GOLD, cursor: 'pointer' }} />
                <input value={c.label} onChange={e => patchCustom(i, { label: e.target.value })} placeholder="Gateway name"
                  className="font-display" style={{ flex: 1, minWidth: 120, fontSize: 17, fontWeight: 600, color: '#f0ece4', background: 'none', border: 'none', borderBottom: '1px solid rgba(240,236,228,0.14)', outline: 'none', padding: '4px 0' }} />
                {on && <span className="font-mono-dm" style={{ fontSize: 8.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#060606', background: GOLD, padding: '3px 7px' }}>Active</span>}
                {c.configured && <span className="font-mono-dm" style={{ fontSize: 10, color: '#7fae7f' }}>••••{c.last4}</span>}
                <button onClick={() => setCustom(l => l.filter((_, idx) => idx !== i))} className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.45)', background: 'none', border: '1px solid rgba(240,236,228,0.14)', padding: '7px 11px', cursor: 'pointer' }}>Remove</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {cField('Public key', c.publicKey, v => patchCustom(i, { publicKey: v }), 'pk_…')}
                {cField('Secret key', c.secretKey, v => patchCustom(i, { secretKey: v }), c.configured ? 'leave blank to keep' : 'sk_…', 'password')}
              </div>

              <button onClick={() => setAdv(a => ({ ...a, [i]: !open }))} className="font-mono-dm"
                style={{ marginTop: 12, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.5)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                {open ? '− Hide advanced' : '+ Advanced (API details)'}
              </button>

              {open && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(240,236,228,0.07)' }}>
                  <p className="font-mono-dm" style={{ fontSize: 10, color: 'rgba(240,236,228,0.4)', lineHeight: 1.7, margin: '0 0 12px' }}>
                    Body-template placeholders: <span style={{ color: GOLD }}>{'{{amount}} {{currency}} {{email}} {{reference}} {{redirect_url}} {{public_key}} {{summary}}'}</span>
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    {cField('Currency', c.currency, v => patchCustom(i, { currency: v }), 'NGN')}
                    {cField('Initialize URL', c.initUrl, v => patchCustom(i, { initUrl: v }), 'https://api.provider.com/charges')}
                    {cField('Checkout-URL path', c.checkoutUrlPath, v => patchCustom(i, { checkoutUrlPath: v }), 'data.checkout_url')}
                    {cField('Verify URL', c.verifyUrl, v => patchCustom(i, { verifyUrl: v }), 'https://api.provider.com/charges/{{reference}}')}
                    {cField('Verify status path', c.verifyStatusPath, v => patchCustom(i, { verifyStatusPath: v }), 'data.status')}
                    {cField('Success value', c.verifySuccessValue, v => patchCustom(i, { verifySuccessValue: v }), 'success')}
                    {cField('Auth header', c.authHeader, v => patchCustom(i, { authHeader: v }), 'Authorization')}
                    {cField('Auth prefix', c.authPrefix, v => patchCustom(i, { authPrefix: v }), 'Bearer ')}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'end', paddingBottom: 12, cursor: 'pointer' }}>
                      <input type="checkbox" checked={c.subunits} onChange={e => patchCustom(i, { subunits: e.target.checked })} style={{ accentColor: GOLD, cursor: 'pointer' }} />
                      <span className="font-mono-dm" style={{ fontSize: 11, color: 'rgba(240,236,228,0.6)' }}>Amount in subunits (×100)</span>
                    </label>
                  </div>
                  <label style={labelStyle}>Request body template (JSON)</label>
                  <textarea value={c.bodyTemplate} onChange={e => patchCustom(i, { bodyTemplate: e.target.value })} spellCheck={false}
                    style={{ ...inputStyle, width: '100%', minHeight: 120, fontFamily: "'DM Mono',monospace", fontSize: 11.5, lineHeight: 1.5, resize: 'vertical' }} />
                </div>
              )}
            </div>
          )
        })}
        {custom.length === 0 && (
          <p className="font-mono-dm" style={{ fontSize: 11, color: 'rgba(240,236,228,0.35)' }}>No gateways yet — click &ldquo;+ Add gateway&rdquo;.</p>
        )}
      </div>

      {err && <p className="font-mono-dm" style={{ fontSize: 12, color: '#cf6b52', margin: '18px 0 0', lineHeight: 1.6 }}>{err}</p>}
      {msg && <p className="font-mono-dm" style={{ fontSize: 12, color: '#7fae7f', margin: '18px 0 0' }}>{msg}</p>}

      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <button onClick={save} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save gateways'}</button>
        <button onClick={load} style={ghostBtn}>Reset</button>
      </div>
      <p className="font-mono-dm" style={{ fontSize: 10, letterSpacing: '0.03em', color: 'rgba(240,236,228,0.3)', lineHeight: 1.7, margin: '20px 0 0' }}>
        Keys are stored on the server, never in the browser. To actually take payments a gateway also needs its API details (Advanced). On Render&rsquo;s free tier keys reset on restart — use env vars or a persistent disk for durability.
      </p>
    </div>
  )
}

function Settings({ onLogout }: { onLogout: () => void }) {
  return (
    <div>
      <p style={kicker}>— Configuration</p>
      <h1 style={sectionTitle}>Payment gateways</h1>
      <p className="font-mono-dm" style={{ fontSize: 11, letterSpacing: '0.03em', color: 'rgba(240,236,228,0.4)', lineHeight: 1.6, margin: '14px 0 28px' }}>
        Add each gateway&rsquo;s public and secret key, then choose which one is active for checkout.
      </p>
      <GatewaySettings />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 36, paddingTop: 24, borderTop: '1px solid rgba(240,236,228,0.08)' }}>
        <button onClick={() => navigate('/shop')} style={ghostBtn}>View shop →</button>
        <button onClick={onLogout} style={{ ...ghostBtn, color: '#cf6b52', borderColor: 'rgba(207,107,82,0.4)' }}>Log out</button>
      </div>
    </div>
  )
}

// ─── Dashboard shell ─────────────────────────────────────────────────────────
const NAV: { key: Section; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'products', label: 'Products' },
  { key: 'orders', label: 'Orders' },
  { key: 'settings', label: 'Settings' },
]

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [section, setSection] = useState<Section>('overview')
  const stack = useMediaQuery('(max-width: 820px)')

  useEffect(() => {
    const prev = document.body.style.cursor
    document.body.style.cursor = 'auto'
    return () => { document.body.style.cursor = prev }
  }, [])

  const navBtn = (n: { key: Section; label: string }) => {
    const active = section === n.key
    return (
      <button key={n.key} onClick={() => setSection(n.key)} className="font-mono-dm"
        style={{
          fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer',
          color: active ? '#060606' : 'rgba(240,236,228,0.6)', background: active ? '#f0ece4' : 'none',
          border: 'none', textAlign: stack ? 'center' : 'left', padding: stack ? '10px 16px' : '12px 16px',
          whiteSpace: 'nowrap', transition: 'all 0.2s', width: stack ? 'auto' : '100%',
        }}>{n.label}</button>
    )
  }

  const brand = (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
      <a href="/" onClick={e => { e.preventDefault(); navigate('/') }} className="font-display" style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.22em', color: '#f0ece4', textDecoration: 'none' }}>VÊTU</a>
      <span className="font-mono-dm" style={{ fontSize: 8.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD }}>Admin</span>
    </div>
  )

  const content = section === 'overview' ? <Overview go={setSection} />
    : section === 'products' ? <Products />
    : section === 'orders' ? <Orders />
    : <Settings onLogout={onLogout} />

  return (
    <div style={{ minHeight: '100vh', background: '#060606', color: '#f0ece4', cursor: 'auto', display: stack ? 'block' : 'flex' }}>
      {stack ? (
        <div style={{ position: 'sticky', top: 0, zIndex: 400, background: 'rgba(6,6,6,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(240,236,228,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
            {brand}
            <button onClick={onLogout} className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}>Log out</button>
          </div>
          <div style={{ display: 'flex', gap: 6, padding: '0 12px 12px', overflowX: 'auto' }}>{NAV.map(navBtn)}</div>
        </div>
      ) : (
        <aside style={{ width: 224, flex: 'none', borderRight: '1px solid rgba(240,236,228,0.08)', padding: '28px 18px', display: 'flex', flexDirection: 'column', gap: 6, position: 'sticky', top: 0, height: '100vh' }}>
          <div style={{ padding: '0 8px 24px' }}>{brand}</div>
          {NAV.map(navBtn)}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 20, borderTop: '1px solid rgba(240,236,228,0.08)' }}>
            <button onClick={() => navigate('/shop')} className="font-mono-dm" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.5)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '8px 16px' }}>View shop →</button>
            <button onClick={onLogout} className="font-mono-dm" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.5)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '8px 16px' }}>Log out</button>
          </div>
        </aside>
      )}
      <main style={{ flex: 1, minWidth: 0, padding: 'clamp(24px,4vw,44px)' }}>{content}</main>
    </div>
  )
}

// ─── Login gate ──────────────────────────────────────────────────────────────
function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const submit = () => { if (adminLogin(pw)) onSuccess(); else { setErr('Incorrect passcode.'); setPw('') } }
  return (
    <div style={{ background: '#060606', minHeight: '100vh', color: '#f0ece4', cursor: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans',sans-serif", padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, justifyContent: 'center', marginBottom: 10 }}>
          <span className="font-display" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '0.22em' }}>VÊTU</span>
          <span className="font-mono-dm" style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD }}>Admin</span>
        </div>
        <p className="font-mono-dm" style={{ fontSize: 11, letterSpacing: '0.06em', color: 'rgba(240,236,228,0.5)', textAlign: 'center', margin: '0 0 32px' }}>Enter the admin passcode to continue.</p>
        <label style={labelStyle}>Passcode</label>
        <input type="password" value={pw} autoFocus onChange={e => { setPw(e.target.value); if (err) setErr('') }} onKeyDown={e => { if (e.key === 'Enter') submit() }} placeholder="••••••••" style={inputStyle} />
        <div style={{ minHeight: 20, paddingTop: 6 }}>{err && <span className="font-mono-dm" style={{ fontSize: 12, color: '#cf6b52' }}>{err}</span>}</div>
        <button onClick={submit} className="font-mono-dm" style={{ width: '100%', ...primaryBtn, padding: 14, marginTop: 8 }}>Enter</button>
        <button onClick={() => navigate('/')} className="font-mono-dm" style={{ width: '100%', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(240,236,228,0.4)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 18 }}>← Back to site</button>
      </div>
    </div>
  )
}

// ─── Gated entry ─────────────────────────────────────────────────────────────
export default function Admin() {
  const [authed, setAuthed] = useState(() => isAdminAuthed())
  if (!authed) return <AdminLogin onSuccess={() => setAuthed(true)} />
  return <Dashboard onLogout={() => { adminLogout(); setAuthed(false) }} />
}
