// ─── VÊTU server ─────────────────────────────────────────────────────────────
// Serves the built SPA (dist/) and provides the Stripe Checkout endpoint.
// The Stripe SECRET key is read from the environment and never reaches the
// browser. Configure STRIPE_SECRET_KEY in the Render dashboard.

import express from 'express'
import Stripe from 'stripe'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(__dirname, '..', 'dist')

// Load a local .env for development; production uses real env vars on the host.
try { process.loadEnvFile(path.join(__dirname, '..', '.env')) } catch { /* no .env present */ }

const PORT = process.env.PORT || 3001
const secret = process.env.STRIPE_SECRET_KEY
const stripe = secret ? new Stripe(secret) : null

const app = express()
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => res.json({ ok: true, payments: !!stripe }))

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Payments are not configured yet (missing STRIPE_SECRET_KEY).' })
    }
    const items = Array.isArray(req.body?.items) ? req.body.items : []
    if (items.length === 0) return res.status(400).json({ error: 'Your bag is empty.' })

    const line_items = items.map(i => {
      const cents = Math.round(Number(i.price) * 100)
      if (!i.name || !(cents > 0)) throw new Error('Invalid cart item.')
      // Stripe only accepts http(s) image URLs — skip data: URLs from uploads.
      const images = typeof i.img === 'string' && /^https?:\/\//.test(i.img) ? [i.img] : []
      return {
        quantity: Math.max(1, Math.min(99, parseInt(i.qty, 10) || 1)),
        price_data: {
          currency: 'usd',
          unit_amount: cents,
          product_data: { name: String(i.name) + (i.size ? ` — ${i.size}` : ''), images },
        },
      }
    })

    const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
      shipping_address_collection: { allowed_countries: ['US', 'GB', 'CA', 'FR', 'DE', 'IT', 'GH'] },
    })
    res.json({ url: session.url })
  } catch (e) {
    console.error('checkout error:', e)
    res.status(500).json({ error: e?.message || 'Could not start checkout.' })
  }
})

// Static assets + SPA fallback (so /shop, /cart, /admin, /checkout/success load).
app.use(express.static(dist))
app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))

app.listen(PORT, () => console.log(`VÊTU server listening on :${PORT} — payments ${stripe ? 'ON' : 'OFF'}`))
