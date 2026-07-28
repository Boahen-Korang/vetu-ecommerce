// ─── Payment gateways (custom only) ──────────────────────────────────────────
// There are no built-in gateways. The admin adds each gateway with a public key
// and a secret key; optional "advanced" fields describe how to call the gateway
// (init URL, auth, a JSON body template with {{placeholders}}, and response
// paths for the checkout URL + verification). Keys live ONLY here (server-side).

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data')
const FILE = path.join(DATA_DIR, 'gateways.json')

const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24)

function normalizeCustom(c, existing) {
  const id = slug(c.id || c.label)
  if (!id) return null
  const prev = existing?.find(x => x.id === id)
  const keep = (v, p) => (typeof v === 'string' && v.trim()) ? v.trim() : (p || '')
  return {
    id,
    label: (c.label || id).slice(0, 40),
    secretKey: keep(c.secretKey, prev?.secretKey),
    publicKey: keep(c.publicKey, prev?.publicKey),
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
  let saved = {}
  try { saved = JSON.parse(fs.readFileSync(FILE, 'utf8')) } catch { /* no file yet */ }
  const customGateways = Array.isArray(saved.customGateways)
    ? saved.customGateways.map(c => normalizeCustom(c)).filter(Boolean) : []
  const ids = new Set(customGateways.map(c => c.id))
  let active = saved.active || process.env.ACTIVE_GATEWAY || ''
  if (!ids.has(active)) active = customGateways[0]?.id || ''
  return { active, customGateways }
}

export function saveConfig(update) {
  const cur = loadConfig()
  let customGateways = cur.customGateways
  if (Array.isArray(update?.customGateways)) {
    customGateways = update.customGateways.map(c => normalizeCustom(c, cur.customGateways)).filter(Boolean)
  }
  const ids = new Set(customGateways.map(c => c.id))
  let active = cur.active
  if (update?.active && ids.has(update.active)) active = update.active
  if (!ids.has(active)) active = customGateways[0]?.id || ''

  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(FILE, JSON.stringify({ active, customGateways }, null, 2))
  return publicConfig()
}

/** Browser-safe view — secret keys are masked; public keys are shown in full. */
export function publicConfig() {
  const cfg = loadConfig()
  return {
    active: cfg.active,
    custom: cfg.customGateways.map(c => ({
      id: c.id, label: c.label,
      configured: !!c.secretKey, last4: c.secretKey ? c.secretKey.slice(-4) : '',
      publicKey: c.publicKey, currency: c.currency, subunits: c.subunits,
      authHeader: c.authHeader, authPrefix: c.authPrefix, initUrl: c.initUrl, bodyTemplate: c.bodyTemplate,
      checkoutUrlPath: c.checkoutUrlPath, verifyUrl: c.verifyUrl, verifyStatusPath: c.verifyStatusPath, verifySuccessValue: c.verifySuccessValue,
    })),
  }
}

export function activeStatus() {
  const cfg = loadConfig()
  const def = cfg.customGateways.find(c => c.id === cfg.active)
  return def ? { provider: def.label || def.id, currency: def.currency || '', payments: !!def.secretKey }
    : { provider: '', currency: '', payments: false }
}

// ── helpers ──
const cents = n => Math.round(Number(n) * 100)
const clampQty = q => Math.max(1, Math.min(99, parseInt(q, 10) || 1))
const rand = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

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

// ── create ──
export async function createCharge({ items, email, origin }) {
  const cfg = loadConfig()
  const def = cfg.customGateways.find(c => c.id === cfg.active)
  if (!def) throw new Error('No payment gateway is configured. Add one in the admin dashboard.')
  if (!def.secretKey) throw new Error(`The active gateway (${def.label}) has no secret key.`)
  if (!def.initUrl || !def.checkoutUrlPath || !def.bodyTemplate) {
    throw new Error(`${def.label} needs its API details (Advanced) — init URL, body template, and checkout-URL path.`)
  }

  let total = 0
  for (const i of items) {
    const price = Number(i.price)
    if (!i.name || !(price > 0)) throw new Error('Invalid cart item.')
    total += price * clampQty(i.qty)
  }
  total = Math.round(total)
  const summary = items.map(i => `${i.name} x${clampQty(i.qty)}`).join(', ').slice(0, 200)

  const reference = `cgw_${def.id}_${rand()}`
  const amount = def.subunits ? cents(total) : total
  const redirect_url = `${origin}/checkout/success?reference=${reference}`
  const body = fillTemplate(def.bodyTemplate, { amount, currency: def.currency, email, reference, redirect_url, summary, public_key: def.publicKey })
  const headers = { 'Content-Type': 'application/json', [def.authHeader || 'Authorization']: (def.authPrefix ?? 'Bearer ') + def.secretKey }
  const r = await fetch(def.initUrl, { method: 'POST', headers, body })
  const d = await r.json().catch(() => ({}))
  const url = getPath(d, def.checkoutUrlPath)
  if (!r.ok || !url) throw new Error((d && (d.message || d.error)) || `${def.label} could not start the payment.`)
  return { url: String(url), reference }
}

// ── verify ──
export async function verifyCharge(reference) {
  if (typeof reference !== 'string' || !reference.startsWith('cgw_')) return 'unknown'
  const id = reference.split('_')[1]
  const def = loadConfig().customGateways.find(c => c.id === id)
  if (!def?.secretKey || !def.verifyUrl || !def.verifyStatusPath) return 'unknown'
  try {
    const url = def.verifyUrl.replace(/\{\{reference\}\}/g, encodeURIComponent(reference))
    const r = await fetch(url, { headers: { [def.authHeader || 'Authorization']: (def.authPrefix ?? 'Bearer ') + def.secretKey } })
    const d = await r.json().catch(() => ({}))
    const status = getPath(d, def.verifyStatusPath)
    return String(status).toLowerCase() === String(def.verifySuccessValue).toLowerCase() ? 'success' : 'failed'
  } catch {
    return 'unknown'
  }
}
