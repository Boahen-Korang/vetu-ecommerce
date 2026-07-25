// ─── VÊTU server ─────────────────────────────────────────────────────────────
// Serves the built SPA (dist/) and provides checkout across multiple payment
// gateways (Korapay / Paystack / Flutterwave / Stripe). Gateway secret keys are
// stored server-side (see gateways.js) and never reach the browser. Admin key
// management is authorized by a server-side passcode (ADMIN_PASSCODE).

import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCharge, verifyCharge, publicConfig, saveConfig, activeStatus } from './gateways.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(__dirname, '..', 'dist')

// Load a local .env for development; production uses real env vars on the host.
try { process.loadEnvFile(path.join(__dirname, '..', '.env')) } catch { /* no .env present */ }

const PORT = process.env.PORT || 3001
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || process.env.VITE_ADMIN_PASSCODE || 'vetu-admin'

const app = express()
app.use(express.json({ limit: '1mb' }))

// ── Storefront payment endpoints ──
app.get('/api/health', (_req, res) => {
  const s = activeStatus()
  res.json({ ok: true, payments: s.payments, provider: s.provider, currency: s.currency })
})

app.post('/api/checkout', async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : []
    const email = String(req.body?.email || '').trim()
    if (items.length === 0) return res.status(400).json({ error: 'Your bag is empty.' })
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'A valid email is required for payment.' })

    const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`
    const { url, reference } = await createCharge({ items, email, origin })
    res.json({ url, reference })
  } catch (e) {
    console.error('checkout error:', e)
    const msg = e?.message || 'Could not start checkout.'
    res.status(/not configured/i.test(msg) ? 503 : 502).json({ error: msg })
  }
})

app.get('/api/verify', async (req, res) => {
  try {
    const reference = String(req.query.reference || '')
    if (!reference) return res.status(400).json({ status: 'unknown', error: 'Missing reference.' })
    res.json({ status: await verifyCharge(reference) })
  } catch (e) {
    res.status(500).json({ status: 'unknown', error: e?.message })
  }
})

// ── Admin gateway configuration (server-authorized) ──
function requireAdmin(req, res, next) {
  if ((req.headers['x-admin-passcode'] || '') !== ADMIN_PASSCODE) {
    return res.status(401).json({ error: 'Unauthorized.' })
  }
  next()
}

app.get('/api/admin/gateways', requireAdmin, (_req, res) => res.json(publicConfig()))

app.post('/api/admin/gateways', requireAdmin, (req, res) => {
  try {
    res.json(saveConfig(req.body || {}))
  } catch (e) {
    console.error('save gateways error:', e)
    res.status(500).json({ error: 'Could not save gateway settings.' })
  }
})

// ── Static assets + SPA fallback ──
app.use(express.static(dist))
app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))

app.listen(PORT, () => {
  const s = activeStatus()
  console.log(`VÊTU server on :${PORT} — active gateway: ${s.provider} (${s.payments ? 'configured' : 'not set'}, ${s.currency})`)
})
