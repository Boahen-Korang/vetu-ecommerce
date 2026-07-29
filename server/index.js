// ─── VÊTU server ─────────────────────────────────────────────────────────────
// Serves the built SPA (dist/) and provides: multi-gateway checkout, customer
// accounts, and orders. Persistence is Postgres (Neon) when DATABASE_URL is set,
// otherwise a local file store. Gateway secret keys stay server-side; admin key
// management is authorized by ADMIN_PASSCODE.

import express from 'express'
import compression from 'compression'
import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCharge, verifyCharge, publicConfig, saveConfig, activeStatus } from './gateways.js'
import {
  initDb, hasDb,
  userByEmail, userById, insertUser, hashPassword, verifyPassword, makeToken, readToken, genId,
  upsertOrder, setOrderStatus, allOrders, allUsers,
  allProducts, upsertProduct, deleteProductDb,
} from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(__dirname, '..', 'dist')

// Load a local .env for development; production uses real env vars on the host.
try { process.loadEnvFile(path.join(__dirname, '..', '.env')) } catch { /* no .env present */ }

const PORT = process.env.PORT || 3001
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || process.env.VITE_ADMIN_PASSCODE || 'vetu-admin'
const COWRIE_WEBHOOK_SECRET = process.env.COWRIE_WEBHOOK_SECRET || ''

const app = express()
app.set('trust proxy', true) // Render terminates TLS upstream — trust X-Forwarded-Proto so req.protocol is https
app.use(compression()) // gzip responses (JS bundle, product JSON) — big transfer-size win
// Capture the raw body so webhook signatures can be verified.
app.use(express.json({ limit: '4mb', verify: (req, _res, buf) => { req.rawBody = buf } }))

const emailOk = e => /^\S+@\S+\.\S+$/.test(e)
const publicUser = u => ({ id: u.id, email: u.email, name: u.name || '' })

// ── Health ──
app.get('/api/health', async (_req, res) => {
  const s = await activeStatus()
  res.json({ ok: true, payments: s.payments, provider: s.provider, currency: s.currency, db: hasDb })
})

// ── Checkout / verify (also records the order) ──
app.post('/api/checkout', async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : []
    const email = String(req.body?.email || '').trim()
    if (items.length === 0) return res.status(400).json({ error: 'Your bag is empty.' })
    if (!emailOk(email)) return res.status(400).json({ error: 'A valid email is required for payment.' })

    const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`
    const { url, reference } = await createCharge({ items, email, origin })

    const amount = items.reduce((s, i) => s + Number(i.price || 0) * Math.max(1, parseInt(i.qty, 10) || 1), 0)
    const delivery = req.body?.delivery && typeof req.body.delivery === 'object' ? req.body.delivery : null
    const now = Date.now()
    await upsertOrder({ reference, email, items, amount, currency: (await activeStatus()).currency, status: 'pending', delivery, created_at: now, updated_at: now })

    res.json({ url, reference })
  } catch (e) {
    console.error('checkout error:', e)
    const msg = e?.message || 'Could not start checkout.'
    res.status(/not configured|no payment gateway/i.test(msg) ? 503 : 502).json({ error: msg })
  }
})

app.get('/api/verify', async (req, res) => {
  try {
    const reference = String(req.query.reference || '')
    if (!reference) return res.status(400).json({ status: 'unknown', error: 'Missing reference.' })
    const status = await verifyCharge(reference)
    if (status === 'success') await setOrderStatus(reference, 'paid')
    else if (status === 'failed') await setOrderStatus(reference, 'failed')
    res.json({ status })
  } catch (e) {
    res.status(500).json({ status: 'unknown', error: e?.message })
  }
})

// ── Payment webhook (server-to-server confirmation) ──
// Cowrie POSTs { type: 'charge.success'|'charge.failed', data: charge } signed
// with header cowrie-signature = HMAC_SHA256(rawBody, webhook_secret).
app.post('/api/webhooks/cowrie', async (req, res) => {
  try {
    if (COWRIE_WEBHOOK_SECRET) {
      const sig = String(req.headers['cowrie-signature'] || '')
      const expected = crypto.createHmac('sha256', COWRIE_WEBHOOK_SECRET).update(req.rawBody || Buffer.from('')).digest('hex')
      if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
        return res.status(401).json({ error: 'Invalid signature.' })
      }
    }
    const type = req.body?.type
    const charge = req.body?.data || {}
    const reference = charge.reference
    if (reference) {
      if (type === 'charge.success' || charge.status === 'success') await setOrderStatus(reference, 'paid')
      else if (type === 'charge.failed' || charge.status === 'failed') await setOrderStatus(reference, 'failed')
    }
    res.json({ received: true })
  } catch (e) {
    console.error('webhook error:', e)
    res.status(200).json({ received: true }) // acknowledge so Cowrie doesn't retry-storm
  }
})

// ── Products (public catalog + admin management) ──
app.get('/api/products', async (_req, res) => {
  try { res.json({ products: await allProducts() }) }
  catch (e) { console.error('products error:', e); res.status(500).json({ error: 'Could not load products.' }) }
})
app.post('/api/admin/products', requireAdmin, async (req, res) => {
  try {
    const p = req.body || {}
    if (!p.id || !p.name || !(Number(p.price) > 0)) return res.status(400).json({ error: 'A product needs a name and a price.' })
    await upsertProduct({
      id: String(p.id), name: String(p.name), subtitle: String(p.subtitle || ''),
      price: Math.round(Number(p.price)), category: String(p.category || ''), tag: String(p.tag || ''),
      img: String(p.img || ''), alt: String(p.alt || p.name), sizes: Array.isArray(p.sizes) ? p.sizes : [], created_at: Date.now(),
    })
    res.json({ ok: true })
  } catch (e) { console.error('save product error:', e); res.status(500).json({ error: 'Could not save product.' }) }
})
app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
  try { await deleteProductDb(req.params.id); res.json({ ok: true }) }
  catch (e) { console.error('delete product error:', e); res.status(500).json({ error: 'Could not delete product.' }) }
})

// ── Customer accounts ──
app.post('/api/auth/register', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim()
    const email = String(req.body?.email || '').trim().toLowerCase()
    const password = String(req.body?.password || '')
    if (!name) return res.status(400).json({ error: 'Name is required.' })
    if (!emailOk(email)) return res.status(400).json({ error: 'Enter a valid email address.' })
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' })
    if (await userByEmail(email)) return res.status(409).json({ error: 'An account with this email already exists.' })

    const user = { id: genId('usr'), email, name, password_hash: hashPassword(password), created_at: Date.now() }
    await insertUser(user)
    res.status(201).json({ token: makeToken({ sub: user.id }), user: publicUser(user) })
  } catch (e) {
    console.error('register error:', e)
    res.status(500).json({ error: 'Could not create your account.' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase()
    const password = String(req.body?.password || '')
    const user = await userByEmail(email)
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Email or password is incorrect.' })
    }
    res.json({ token: makeToken({ sub: user.id }), user: publicUser(user) })
  } catch (e) {
    console.error('login error:', e)
    res.status(500).json({ error: 'Could not sign you in.' })
  }
})

app.get('/api/auth/me', async (req, res) => {
  const data = readToken((req.headers.authorization || '').replace(/^Bearer\s+/, ''))
  const user = data && (await userById(data.sub))
  if (!user) return res.status(401).json({ error: 'Not signed in.' })
  res.json({ user: publicUser(user) })
})

// ── Admin (server-authorized) ──
function requireAdmin(req, res, next) {
  if ((req.headers['x-admin-passcode'] || '') !== ADMIN_PASSCODE) return res.status(401).json({ error: 'Unauthorized.' })
  next()
}

app.get('/api/admin/gateways', requireAdmin, async (_req, res) => res.json(await publicConfig()))
app.post('/api/admin/gateways', requireAdmin, async (req, res) => {
  try { res.json(await saveConfig(req.body || {})) }
  catch (e) { console.error('save gateways error:', e); res.status(500).json({ error: 'Could not save gateway settings.' }) }
})
app.get('/api/admin/orders', requireAdmin, async (_req, res) => {
  try { res.json({ orders: await allOrders() }) }
  catch (e) { console.error('orders error:', e); res.status(500).json({ error: 'Could not load orders.' }) }
})
app.get('/api/admin/customers', requireAdmin, async (_req, res) => {
  try { res.json({ users: await allUsers() }) }
  catch (e) { console.error('customers error:', e); res.status(500).json({ error: 'Could not load customers.' }) }
})
// Re-check every pending order against the gateway and update it (fixes orders
// where payment succeeded but the customer never returned to /checkout/success).
app.post('/api/admin/reconcile', requireAdmin, async (_req, res) => {
  try {
    const pending = (await allOrders()).filter(o => o.status === 'pending')
    let paid = 0, failed = 0
    for (const o of pending) {
      const s = await verifyCharge(o.reference)
      if (s === 'success') { await setOrderStatus(o.reference, 'paid'); paid++ }
      else if (s === 'failed') { await setOrderStatus(o.reference, 'failed'); failed++ }
    }
    res.json({ checked: pending.length, paid, failed })
  } catch (e) {
    console.error('reconcile error:', e); res.status(500).json({ error: 'Could not sync payments.' })
  }
})

// ── Static assets + SPA fallback ──
// Fingerprinted files under /assets never change for a given name → cache for a year.
app.use('/assets', express.static(path.join(dist, 'assets'), { immutable: true, maxAge: '1y' }))
app.use(express.static(dist)) // favicon, robots, etc.
// index.html must stay fresh so a new deploy's asset hashes are picked up immediately.
app.get('*', (_req, res) => {
  res.set('Cache-Control', 'no-cache')
  res.sendFile(path.join(dist, 'index.html'))
})

initDb()
  .catch(e => console.error('DB init failed (continuing with file store):', e.message))
  .finally(() => {
    app.listen(PORT, async () => {
      const s = await activeStatus()
      console.log(`VÊTU server on :${PORT} — gateway: ${s.provider || 'none'} (${s.payments ? 'configured' : 'not set'}), db: ${hasDb ? 'postgres' : 'file'}`)
    })
  })
