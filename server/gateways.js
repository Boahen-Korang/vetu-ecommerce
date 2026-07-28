// ─── Payment gateways ────────────────────────────────────────────────────────
// Server-side config + a common create/verify interface over payment gateways.
// Built-ins (Korapay/Paystack/Flutterwave/Stripe) have bespoke adapters; ANY
// other ("custom") gateway is defined by the admin via a template: init URL,
// auth, a JSON body with {{placeholders}}, and response paths to the checkout
// URL and verification status. Secret keys live ONLY here, never in the browser.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data')
const FILE = path.join(DATA_DIR, 'gateways.json')

export const SUPPORTED = ['korapay', 'paystack', 'flutterwave', 'stripe']
export const GATEWAY_LABELS = { korapay: 'Korapay', paystack: 'Paystack', flutterwave: 'Flutterwave', stripe: 'Stripe' }

const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24)

function envDefaults() {
  return {
    active: process.env.ACTIVE_GATEWAY || 'korapay',
    gateways: {
      korapay: { secretKey: process.env.KORAPAY_SECRET_KEY || '', currency: process.env.KORAPAY_CURRENCY || 'NGN' },
      paystack: { secretKey: process.env.PAYSTACK_SECRET_KEY || '', currency: process.env.PAYSTACK_CURRENCY || 'NGN' },
      flutterwave: { secretKey: process.env.FLW_SECRET_KEY || '', currency: process.env.FLW_CURRENCY || 'NGN' },
      stripe: { secretKey: process.env.STRIPE_SECRET_KEY || '', currency: process.env.STRIPE_CURRENCY || 'usd' },
    },
    customGateways: [],
  }
}

function normalizeCustom(c, existing) {
  const id = slug(c.id || c.label)
  if (!id) return null
  const prev = existing?.find(x => x.id === id)
  const secretKey = (typeof c.secretKey === 'string' && c.secretKey.trim()) ? c.secretKey.trim() : (prev?.secretKey || '')
  return {
    id,
    label: (c.label || id).slice(0, 40),
    secretKey,
    currency: c.currency || 'NGN',
    subunits: !!c.subunits,
    authHeader: c.authHeader || 'Authorization',
    authPrefix: c.authPrefix ?? 'Bearer ',
    initUrl: c.initUrl || '',
    bodyTemplate: c.bodyTemplate || '',
    checkoutUrlPath: c.checkoutUrlPath || '',
    verifyUrl: c.verifyUrl || '',
    verifyStatusPath: c.verifyStatusPath || '',
    verifySuccessValue: c.verifySuccessValue || 'success',
  }
}

export function loadConfig() {
  const d = envDefaults()
  let saved = {}
  try { saved = JSON.parse(fs.readFileSync(FILE, 'utf8')) } catch { /* no file yet */ }
  const cfg = { active: saved.active || d.active, gateways: {}, customGateways: [] }
  for (const g of SUPPORTED) cfg.gateways[g] = { ...d.gateways[g], ...(saved.gateways?.[g] || {}) }
  if (Array.isArray(saved.customGateways)) {
    cfg.customGateways = saved.customGateways.map(c => normalizeCustom(c)).filter(Boolean)
  }
  const known = new Set([...SUPPORTED, ...cfg.customGateways.map(c => c.id)])
  if (!known.has(cfg.active)) cfg.active = 'korapay'
  return cfg
}

export function saveConfig(update) {
  const cur = loadConfig()
  const next = { active: cur.active, gateways: {}, customGateways: cur.customGateways }
  for (const g of SUPPORTED) {
    const u = (update?.gateways && update.gateways[g]) || {}
    next.gateways[g] = {
      secretKey: (typeof u.secretKey === 'string' && u.secretKey.trim()) ? u.secretKey.trim() : cur.gateways[g].secretKey,
      currency: (typeof u.currency === 'string' && u.currency.trim()) ? u.currency.trim() : cur.gateways[g].currency,
    }
  }
  if (Array.isArray(update?.customGateways)) {
    next.customGateways = update.customGateways.map(c => normalizeCustom(c, cur.customGateways)).filter(Boolean)
  }
  const known = new Set([...SUPPORTED, ...next.customGateways.map(c => c.id)])
  if (update?.active && known.has(update.active)) next.active = update.active
  else if (!known.has(next.active)) next.active = 'korapay'

  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(FILE, JSON.stringify(next, null, 2))
  return publicConfig()
}

/** Safe view for the browser — never exposes full secret keys. */
export function publicConfig() {
  const cfg = loadConfig()
  const out = { active: cfg.active, supported: SUPPORTED, labels: GATEWAY_LABELS, gateways: {}, custom: [] }
  for (const g of SUPPORTED) {
    const k = cfg.gateways[g].secretKey || ''
    out.gateways[g] = { configured: !!k, last4: k ? k.slice(-4) : '', currency: cfg.gateways[g].currency }
  }
  out.custom = cfg.customGateways.map(c => ({
    id: c.id, label: c.label, configured: !!c.secretKey, last4: c.secretKey ? c.secretKey.slice(-4) : '',
    currency: c.currency, subunits: c.subunits, authHeader: c.authHeader, authPrefix: c.authPrefix,
    initUrl: c.initUrl, bodyTemplate: c.bodyTemplate, checkoutUrlPath: c.checkoutUrlPath,
    verifyUrl: c.verifyUrl, verifyStatusPath: c.verifyStatusPath, verifySuccessValue: c.verifySuccessValue,
  }))
  return out
}

export function activeStatus() {
  const cfg = loadConfig()
  const g = cfg.active
  if (SUPPORTED.includes(g)) {
    const conf = cfg.gateways[g] || {}
    return { provider: g, currency: conf.currency || '', payments: !!conf.secretKey }
  }
  const def = cfg.customGateways.find(c => c.id === g)
  return def ? { provider: def.label || def.id, currency: def.currency || '', payments: !!def.secretKey }
    : { provider: g, currency: '', payments: false }
}

// ── helpers ──
const cents = n => Math.round(Number(n) * 100)
const clampQty = q => Math.max(1, Math.min(99, parseInt(q, 10) || 1))
const rand = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
const PREFIX = { korapay: 'kora', paystack: 'pstk', flutterwave: 'flw' }

function getPath(obj, dotted) {
  if (!dotted) return undefined
  return dotted.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj)
}
function fillTemplate(tpl, vars) {
  return String(tpl).replace(/\{\{(\w+)\}\}/g, (_, k) => {
    const v = vars[k]
    if (v === undefined) return ''
    if (k === 'amount') return String(v) // numeric, unquoted in the template
    return String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"') // JSON-escape strings
  })
}

export function gatewayFromRef(ref) {
  if (typeof ref !== 'string') return null
  if (ref.startsWith('cs_')) return 'stripe'
  if (ref.startsWith('kora_')) return 'korapay'
  if (ref.startsWith('pstk_')) return 'paystack'
  if (ref.startsWith('flw_')) return 'flutterwave'
  return null
}

// ── create ──
export async function createCharge({ items, email, origin }) {
  const cfg = loadConfig()
  const g = cfg.active
  let total = 0
  for (const i of items) {
    const price = Number(i.price)
    if (!i.name || !(price > 0)) throw new Error('Invalid cart item.')
    total += price * clampQty(i.qty)
  }
  total = Math.round(total)
  const summary = items.map(i => `${i.name} x${clampQty(i.qty)}`).join(', ').slice(0, 200)

  if (SUPPORTED.includes(g)) {
    const conf = cfg.gateways[g]
    if (!conf?.secretKey) throw new Error(`The active gateway (${GATEWAY_LABELS[g] || g}) is not configured.`)
    return chargeBuiltin(g, conf, { items, total, email, origin, summary })
  }
  const def = cfg.customGateways.find(c => c.id === g)
  if (!def?.secretKey) throw new Error(`The active gateway (${def?.label || g}) is not configured.`)
  return chargeCustom(def, { total, email, origin, summary })
}

async function chargeBuiltin(g, conf, { items, total, email, origin, summary }) {
  const currency = conf.currency
  const auth = { Authorization: `Bearer ${conf.secretKey}` }
  const json = { ...auth, 'Content-Type': 'application/json' }

  if (g === 'korapay') {
    const reference = `kora_${rand()}`
    const r = await fetch('https://api.korapay.com/merchant/api/v1/charges/initialize', { method: 'POST', headers: json, body: JSON.stringify({ amount: total, currency, reference, redirect_url: `${origin}/checkout/success?reference=${reference}`, narration: 'VÊTU order', customer: { email }, channels: ['card', 'bank_transfer'], metadata: { summary } }) })
    const d = await r.json().catch(() => ({}))
    if (!r.ok || !d?.status || !d?.data?.checkout_url) throw new Error(d?.message || 'Korapay could not start the payment.')
    return { url: d.data.checkout_url, reference }
  }
  if (g === 'paystack') {
    const reference = `pstk_${rand()}`
    const r = await fetch('https://api.paystack.co/transaction/initialize', { method: 'POST', headers: json, body: JSON.stringify({ email, amount: cents(total), currency, reference, callback_url: `${origin}/checkout/success?reference=${reference}`, metadata: { summary } }) })
    const d = await r.json().catch(() => ({}))
    if (!r.ok || !d?.status || !d?.data?.authorization_url) throw new Error(d?.message || 'Paystack could not start the payment.')
    return { url: d.data.authorization_url, reference }
  }
  if (g === 'flutterwave') {
    const reference = `flw_${rand()}`
    const r = await fetch('https://api.flutterwave.com/v3/payments', { method: 'POST', headers: json, body: JSON.stringify({ tx_ref: reference, amount: total, currency, redirect_url: `${origin}/checkout/success?reference=${reference}`, customer: { email }, customizations: { title: 'VÊTU' }, meta: { summary } }) })
    const d = await r.json().catch(() => ({}))
    if (!r.ok || d?.status !== 'success' || !d?.data?.link) throw new Error(d?.message || 'Flutterwave could not start the payment.')
    return { url: d.data.link, reference }
  }
  // stripe
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
  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { ...auth, 'Content-Type': 'application/x-www-form-urlencoded' }, body: p.toString() })
  const d = await r.json().catch(() => ({}))
  if (!r.ok || !d?.url || !d?.id) throw new Error(d?.error?.message || 'Stripe could not start the payment.')
  return { url: d.url, reference: d.id }
}

async function chargeCustom(def, { total, email, origin, summary }) {
  if (!def.initUrl || !def.checkoutUrlPath || !def.bodyTemplate) {
    throw new Error(`${def.label} is missing its init URL, body template, or checkout-URL path.`)
  }
  const reference = `cgw_${def.id}_${rand()}`
  const amount = def.subunits ? cents(total) : Math.round(total)
  const redirect_url = `${origin}/checkout/success?reference=${reference}`
  const body = fillTemplate(def.bodyTemplate, { amount, currency: def.currency, email, reference, redirect_url, summary })
  const headers = { 'Content-Type': 'application/json', [def.authHeader || 'Authorization']: (def.authPrefix ?? 'Bearer ') + def.secretKey }
  const r = await fetch(def.initUrl, { method: 'POST', headers, body })
  const d = await r.json().catch(() => ({}))
  const url = getPath(d, def.checkoutUrlPath)
  if (!r.ok || !url) throw new Error((d && (d.message || d.error)) || `${def.label} could not start the payment.`)
  return { url: String(url), reference }
}

// ── verify ──
export async function verifyCharge(reference) {
  if (typeof reference === 'string' && reference.startsWith('cgw_')) {
    const id = reference.split('_')[1]
    const def = loadConfig().customGateways.find(c => c.id === id)
    if (!def?.secretKey || !def.verifyUrl || !def.verifyStatusPath) return 'unknown'
    try {
      const url = def.verifyUrl.replace(/\{\{reference\}\}/g, encodeURIComponent(reference))
      const r = await fetch(url, { headers: { [def.authHeader || 'Authorization']: (def.authPrefix ?? 'Bearer ') + def.secretKey } })
      const d = await r.json().catch(() => ({}))
      const status = getPath(d, def.verifyStatusPath)
      return String(status).toLowerCase() === String(def.verifySuccessValue).toLowerCase() ? 'success' : 'failed'
    } catch { return 'unknown' }
  }

  const g = gatewayFromRef(reference)
  if (!g) return 'unknown'
  const conf = loadConfig().gateways[g]
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
    const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(reference)}`, { headers: auth })
    const d = await r.json().catch(() => ({}))
    return d?.payment_status === 'paid' ? 'success' : 'failed'
  } catch { return 'unknown' }
}
