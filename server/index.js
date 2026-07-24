// ─── VÊTU server ─────────────────────────────────────────────────────────────
// Serves the built SPA (dist/) and integrates Korapay hosted checkout:
//   POST /api/checkout  -> initialize a charge, return the checkout_url
//   GET  /api/verify    -> confirm a charge's status by reference
// The Korapay SECRET key is read from the environment and never reaches the
// browser. Configure KORAPAY_SECRET_KEY in the Render dashboard.

import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(__dirname, '..', 'dist')

// Load a local .env for development; production uses real env vars on the host.
try { process.loadEnvFile(path.join(__dirname, '..', '.env')) } catch { /* no .env present */ }

const PORT = process.env.PORT || 3001
const KORA_SECRET = process.env.KORAPAY_SECRET_KEY
const CURRENCY = process.env.KORAPAY_CURRENCY || 'NGN'
const KORA_BASE = 'https://api.korapay.com/merchant/api/v1'

const app = express()
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) =>
  res.json({ ok: true, payments: !!KORA_SECRET, provider: 'korapay', currency: CURRENCY }))

const makeRef = () => 'vetu_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10)

app.post('/api/checkout', async (req, res) => {
  try {
    if (!KORA_SECRET) return res.status(503).json({ error: 'Payments are not configured yet (missing KORAPAY_SECRET_KEY).' })

    const items = Array.isArray(req.body?.items) ? req.body.items : []
    const email = String(req.body?.email || '').trim()
    if (items.length === 0) return res.status(400).json({ error: 'Your bag is empty.' })
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'A valid email is required for payment.' })

    let amount = 0
    for (const i of items) {
      const price = Number(i.price)
      const qty = Math.max(1, Math.min(99, parseInt(i.qty, 10) || 1))
      if (!i.name || !(price > 0)) throw new Error('Invalid cart item.')
      amount += price * qty
    }
    amount = Math.round(amount)

    const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`
    const reference = makeRef()

    const kr = await fetch(`${KORA_BASE}/charges/initialize`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KORA_SECRET}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        currency: CURRENCY,
        reference,
        redirect_url: `${origin}/checkout/success?reference=${reference}`,
        narration: 'VÊTU order',
        customer: { email },
        channels: ['card', 'bank_transfer'],
        metadata: { summary: items.map(i => `${i.name} x${i.qty}`).join(', ').slice(0, 200) },
      }),
    })
    const data = await kr.json().catch(() => ({}))
    if (!kr.ok || !data?.status || !data?.data?.checkout_url) {
      return res.status(502).json({ error: data?.message || 'Could not start payment.' })
    }
    res.json({ url: data.data.checkout_url, reference })
  } catch (e) {
    console.error('checkout error:', e)
    res.status(500).json({ error: e?.message || 'Could not start checkout.' })
  }
})

app.get('/api/verify', async (req, res) => {
  try {
    if (!KORA_SECRET) return res.status(503).json({ status: 'unknown', error: 'Payments not configured.' })
    const reference = String(req.query.reference || '')
    if (!reference) return res.status(400).json({ status: 'unknown', error: 'Missing reference.' })

    const kr = await fetch(`${KORA_BASE}/charges/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${KORA_SECRET}` },
    })
    const data = await kr.json().catch(() => ({}))
    res.json({ status: data?.data?.status || 'unknown' })
  } catch (e) {
    res.status(500).json({ status: 'unknown', error: e?.message })
  }
})

// Static assets + SPA fallback (so /shop, /cart, /admin, /checkout/success load).
app.use(express.static(dist))
app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))

app.listen(PORT, () => console.log(`VÊTU server on :${PORT} — Korapay ${KORA_SECRET ? 'ON' : 'OFF'} (${CURRENCY})`))
