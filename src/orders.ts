// ─── Orders ──────────────────────────────────────────────────────────────────
// Orders are recorded client-side (localStorage) when checkout starts, then
// marked paid/failed after Korapay verification. NOTE: this is per-browser —
// an order placed on a customer's device won't appear in the admin's browser.
// Reliable cross-device orders require a backend/DB (Korapay webhook -> store).

import type { CartItem } from './cart'

export type OrderStatus = 'pending' | 'paid' | 'failed'

export type Order = {
  reference: string
  email: string
  items: CartItem[]
  amount: number
  createdAt: number
  status: OrderStatus
}

const KEY = 'vetu_orders'

function read(): Order[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as Order[]
    }
  } catch {
    /* unavailable / malformed */
  }
  return []
}

function write(list: Order[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* ignore */ }
}

/** Newest first. */
export function loadOrders(): Order[] {
  return read().sort((a, b) => b.createdAt - a.createdAt)
}

export function saveOrder(order: Order) {
  write([order, ...read().filter(o => o.reference !== order.reference)])
}

export function updateOrderStatus(reference: string, status: OrderStatus) {
  write(read().map(o => (o.reference === reference ? { ...o, status } : o)))
}
