// ─── Data layer ──────────────────────────────────────────────────────────────
// Uses Neon/Postgres when DATABASE_URL is set; otherwise falls back to a local
// JSON file store (so the app runs in dev and never hard-fails). Provides
// settings (gateway config), users (accounts), and orders.

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data')

const url = process.env.DATABASE_URL
export const pool = url ? new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, max: 5 }) : null
export const hasDb = !!pool

export async function initDb() {
  if (!pool) { console.log('DB: none (DATABASE_URL not set) — using file store'); return }
  await pool.query(`CREATE TABLE IF NOT EXISTS settings (key text PRIMARY KEY, value jsonb NOT NULL)`)
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY, email text UNIQUE NOT NULL, name text,
    password_hash text NOT NULL, created_at bigint)`)
  await pool.query(`CREATE TABLE IF NOT EXISTS orders (
    reference text PRIMARY KEY, email text, items jsonb, amount numeric,
    currency text, status text, delivery jsonb, created_at bigint, updated_at bigint)`)
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery jsonb`)
  console.log('DB: connected (Postgres)')
}

// ── file-store helpers (fallback) ──
function readJson(file, def) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8')) } catch { return def }
}
function writeJson(file, value) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(value, null, 2))
}

// ── settings (key → JSON value) ──
export async function getSetting(key) {
  if (pool) {
    const r = await pool.query('SELECT value FROM settings WHERE key=$1', [key])
    return r.rows[0]?.value ?? null
  }
  return readJson('settings.json', {})[key] ?? null
}
export async function setSetting(key, value) {
  if (pool) {
    await pool.query('INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=$2', [key, value])
    return
  }
  const all = readJson('settings.json', {}); all[key] = value; writeJson('settings.json', all)
}

// ── users ──
export async function userByEmail(email) {
  if (pool) {
    const r = await pool.query('SELECT * FROM users WHERE lower(email)=lower($1) LIMIT 1', [email])
    return r.rows[0] || null
  }
  return readJson('users.json', []).find(u => u.email.toLowerCase() === String(email).toLowerCase()) || null
}
export async function userById(id) {
  if (pool) {
    const r = await pool.query('SELECT * FROM users WHERE id=$1 LIMIT 1', [id])
    return r.rows[0] || null
  }
  return readJson('users.json', []).find(u => u.id === id) || null
}
export async function insertUser(u) {
  if (pool) {
    await pool.query('INSERT INTO users(id,email,name,password_hash,created_at) VALUES($1,$2,$3,$4,$5)',
      [u.id, u.email, u.name, u.password_hash, u.created_at])
    return u
  }
  const arr = readJson('users.json', []); arr.push(u); writeJson('users.json', arr); return u
}

// ── orders ──
export async function upsertOrder(o) {
  if (pool) {
    await pool.query(`INSERT INTO orders(reference,email,items,amount,currency,status,delivery,created_at,updated_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT(reference) DO UPDATE SET status=$6, updated_at=$9`,
      [o.reference, o.email, JSON.stringify(o.items || []), o.amount, o.currency, o.status,
       o.delivery ? JSON.stringify(o.delivery) : null, o.created_at, o.updated_at])
    return
  }
  const arr = readJson('orders.json', [])
  const i = arr.findIndex(x => x.reference === o.reference)
  if (i >= 0) arr[i] = { ...arr[i], ...o }; else arr.unshift(o)
  writeJson('orders.json', arr)
}
export async function setOrderStatus(reference, status) {
  if (pool) {
    await pool.query('UPDATE orders SET status=$2, updated_at=$3 WHERE reference=$1', [reference, status, Date.now()])
    return
  }
  const arr = readJson('orders.json', [])
  const o = arr.find(x => x.reference === reference)
  if (o) { o.status = status; o.updated_at = Date.now(); writeJson('orders.json', arr) }
}
export async function allOrders() {
  if (pool) {
    const r = await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 500')
    return r.rows.map(o => ({ ...o, amount: Number(o.amount) }))
  }
  return readJson('orders.json', []).slice().sort((a, b) => (b.created_at || 0) - (a.created_at || 0))
}

// ── auth helpers ──
const APP_SECRET = process.env.APP_SECRET || process.env.ADMIN_PASSCODE || 'vetu_dev_secret_change_me'

export function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(String(pw), salt, 64).toString('hex')
  return `${salt}:${hash}`
}
export function verifyPassword(pw, stored) {
  const [salt, hash] = String(stored || '').split(':')
  if (!salt || !hash) return false
  const h = crypto.scryptSync(String(pw), salt, 64).toString('hex')
  return h.length === hash.length && crypto.timingSafeEqual(Buffer.from(h, 'hex'), Buffer.from(hash, 'hex'))
}
export function makeToken(payload, ttlSec = 60 * 60 * 24 * 30) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + ttlSec * 1000 })).toString('base64url')
  const sig = crypto.createHmac('sha256', APP_SECRET).update(body).digest('base64url')
  return `${body}.${sig}`
}
export function readToken(token) {
  const [body, sig] = String(token || '').split('.')
  if (!body || !sig) return null
  const expected = crypto.createHmac('sha256', APP_SECRET).update(body).digest('base64url')
  if (sig !== expected) return null
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString())
    if (data.exp && data.exp < Date.now()) return null
    return data
  } catch { return null }
}

export const genId = (p) => p + '_' + crypto.randomBytes(9).toString('hex')
