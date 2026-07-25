// ─── Payment gateways ────────────────────────────────────────────────────────
// Server-side config + a common create/verify interface over multiple gateways.
// Secret keys live ONLY here (server), persisted to a JSON file under DATA_DIR,
// with environment variables as defaults/fallback. Never sent to the browser.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data')
const FILE = path.join(DATA_DIR, 'gateways.json')

export const SUPPORTED = ['korapay', 'paystack', 'flutterwave', 'stripe']
export const GATEWAY_LABELS = { korapay: 'Korapay', paystack: 'Paystack', flutterwave: 'Flutterwave', stripe: 'Stripe' }

function envDefaults() {
  return {
    active: process.env.ACTIVE_GATEWAY || 'korapay',
    gateways: {
      korapay: { secretKey: process.env.KORAPAY_SECRET_KEY || '', currency: process.env.KORAPAY_CURRENCY || 'NGN' },
      paystack: { secretKey: process.env.PAYSTACK_SECRET_KEY || '', currency: process.env.PAYSTACK_CURRENCY || 'NGN' },
      flutterwave: { secretKey: process.env.FLW_SECRET_KEY || '', currency: process.env.FLW_CURRENCY || 'NGN' },
      stripe: { secretKey: process.env.STRIPE_SECRET_KEY || '', currency: process.env.STRIPE_CURRENCY || 'usd' },
    },
  }
}

export function loadConfig() {
  const d = envDefaults()
  let saved = {}
  try { saved = JSON.parse(fs.readFileSync(FILE, 'utf8')) } catch { /* no file yet */ }
  const cfg = { active: saved.active || d.active, gateways: {} }
  for (const g of SUPPORTED) cfg.gateways[g] = { ...d.gateways[g], ...(saved.gateways?.[g] || {}) }
  if (!SUPPORTED.includes(cfg.active)) cfg.active = 'korapay'
  return cfg
}

export function saveConfig(update) {
  const cur = loadConfig()
  const next = { active: SUPPORTED.includes(update?.active) ? update.active : cur.active, gateways: {} }
  for (const g of SUPPORTED) {
    const u = (update?.gateways && update.gateways[g]) || {}
    next.gateways[g] = {
      // Blank secret = keep the existing one (so admins needn't re-enter it).
      secretKey: (typeof u.secretKey === 'string' && u.secretKey.trim()) ? u.secretKey.trim() : cur.gateways[g].secretKey,
      currency: (typeof u.currency === 'string' && u.currency.trim()) ? u.currency.trim() : cur.gateways[g].currency,
    }
  }
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(FILE, JSON.stringify(next, null, 2))
  return publicConfig()
}

/** Safe view for the browser — never exposes full secret keys. */
export function publicConfig() {
  const cfg = loadConfig()
  const out = { active: cfg.active, supported: SUPPORTED, labels: GATEWAY_LABELS, gateways: {} }
  for (const g of SUPPORTED) {
    const k = cfg.gateways[g].secretKey || ''
    out.gateways[g] = { configured: !!k, last4: k ? k.slice(-4) : '', currency: cfg.gateways[g].currency }
  }
  return out
}

export function activeStatus() {
  const cfg = loadConfig()
  const conf = cfg.gateways[cfg.active] || {}
  return { provider: cfg.active, currency: conf.currency || '', payments: !!conf.secretKey }
}

const PREFIX = { korapay: 'kora', paystack: 'pstk', flutterwave: 'flw' }
const makeRef = g => `${PREFIX[g]}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

export function gatewayFromRef(ref) {
  if (typeof ref !== 'string') return null
  if (ref.startsWith('cs_')) return 'stripe'
  if (ref.startsWith('kora_')) return 'korapay'
  if (ref.startsWith('pstk_')) return 'paystack'
  if (ref.startsWith('flw_')) return 'flutterwave'
  return null
}

const cents = n => Math.round(Number(n) * 100)
const clampQty = q => Math.max(1, Math.min(99, parseInt(q, 10) || 1))

/** Create a hosted-checkout charge on the ACTIVE gateway. Returns { url, reference }. */
export async function createCharge({ items, email, origin }) {
  const cfg = loadConfig()
  const g = cfg.active
  const conf = cfg.gateways[g]
  if (!conf?.secretKey) throw new Error(`The active gateway (${GATEWAY_LABELS[g] || g}) is not configured.`)
  const currency = conf.currency
  let total = 0
  for (const i of items) {
    const price = Number(i.price)
    if (!i.name || !(price > 0)) throw new Error('Invalid cart item.')
    total += price * clampQty(i.qty)
  }
  total = Math.round(total)
  const summary = items.map(i => `${i.name} x${clampQty(i.qty)}`).join(', ').slice(0, 200)
  const auth = { Authorization: `Bearer ${conf.secretKey}` }
  const json = { ...auth, 'Content-Type': 'application/json' }

  if (g === 'korapay') {
    const reference = makeRef(g)
    const r = await fetch('https://api.korapay.com/merchant/api/v1/charges/initialize', {
      method: 'POST', headers: json,
      body: JSON.stringify({ amount: total, currency, reference, redirect_url: `${origin}/checkout/success?reference=${reference}`, narration: 'VÊTU order', customer: { email }, channels: ['card', 'bank_transfer'], metadata: { summary } }),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok || !d?.status || !d?.data?.checkout_url) throw new Error(d?.message || 'Korapay could not start the payment.')
    return { url: d.data.checkout_url, reference }
  }

  if (g === 'paystack') {
    const reference = makeRef(g)
    const r = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST', headers: json,
      body: JSON.stringify({ email, amount: cents(total), currency, reference, callback_url: `${origin}/checkout/success?reference=${reference}`, metadata: { summary } }),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok || !d?.status || !d?.data?.authorization_url) throw new Error(d?.message || 'Paystack could not start the payment.')
    return { url: d.data.authorization_url, reference }
  }

  if (g === 'flutterwave') {
    const reference = makeRef(g)
    const r = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST', headers: json,
      body: JSON.stringify({ tx_ref: reference, amount: total, currency, redirect_url: `${origin}/checkout/success?reference=${reference}`, customer: { email }, customizations: { title: 'VÊTU' }, meta: { summary } }),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok || d?.status !== 'success' || !d?.data?.link) throw new Error(d?.message || 'Flutterwave could not start the payment.')
    return { url: d.data.link, reference }
  }

  if (g === 'stripe') {
    const p = new URLSearchParams()
    p.set('mode', 'payment')
    p.set('success_url', `${origin}/checkout/success?reference={CHECKOUT_SESSION_ID}`)
    p.set('cancel_url', `${origin}/cart`)
    p.set('customer_email', email)
    items.forEach((it, i) => {
      p.set(`line_items[${i}][price_data][currency]`, currency)
      p.set(`line_items[${i}][price_data][product_data][name]`, String(it.name) + (it.size ? ` — ${it.size}` : ''))
      p.set(`line_items[${i}][price_data][unit_amount]`, String(cents(it.price)))
      p.set(`line_items[${i}][quantity]`, String(clampQty(it.qty)))
    })
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST', headers: { ...auth, 'Content-Type': 'application/x-www-form-urlencoded' }, body: p.toString(),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok || !d?.url || !d?.id) throw new Error(d?.error?.message || 'Stripe could not start the payment.')
    return { url: d.url, reference: d.id }
  }

  throw new Error('Unknown gateway.')
}

/** Verify a charge by reference. Returns 'success' | 'failed' | 'unknown'. */
export async function verifyCharge(reference) {
  const g = gatewayFromRef(reference)
  if (!g) return 'unknown'
  const cfg = loadConfig()
  const conf = cfg.gateways[g]
  if (!conf?.secretKey) return 'unknown'
  const auth = { Authorization: `Bearer ${conf.secretKey}` }
  try {
    if (g === 'korapay') {
      const r = await fetch(`https://api.korapay.com/merchant/api/v1/charges/${encodeURIComponent(reference)}`, { headers: auth })
      const d = await r.json().catch(() => ({}))
      return d?.data?.status === 'success' ? 'success' : 'failed'
    }
    if (g === 'paystack') {
      const r = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: auth })
      const d = await r.json().catch(() => ({}))
      return d?.data?.status === 'success' ? 'success' : 'failed'
    }
    if (g === 'flutterwave') {
      const r = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`, { headers: auth })
      const d = await r.json().catch(() => ({}))
      return d?.data?.status === 'successful' ? 'success' : 'failed'
    }
    if (g === 'stripe') {
      const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(reference)}`, { headers: auth })
      const d = await r.json().catch(() => ({}))
      return d?.payment_status === 'paid' ? 'success' : 'failed'
    }
  } catch {
    return 'unknown'
  }
  return 'unknown'
}
