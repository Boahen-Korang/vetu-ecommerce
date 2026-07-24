// ─── Shopping cart ───────────────────────────────────────────────────────────
// Persistent (localStorage) cart shared across pages via useSyncExternalStore.
// The in-memory `cache` is the source of truth so getSnapshot returns a stable
// reference between mutations (avoids the useSyncExternalStore re-render loop).

import { useSyncExternalStore } from 'react'
import type { Product } from './products'

export type CartItem = {
  id: string
  name: string
  price: number
  img: string
  size: string
  qty: number
}

const KEY = 'vetu_cart'
const listeners = new Set<() => void>()

function readStorage(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as CartItem[]
    }
  } catch {
    /* storage unavailable / malformed */
  }
  return []
}

let cache: CartItem[] = readStorage()

function commit(next: CartItem[]) {
  cache = next
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* ignore */ }
  listeners.forEach(l => l())
}

export function getCart(): CartItem[] { return cache }
export function cartCount(): number { return cache.reduce((n, i) => n + i.qty, 0) }
export function cartSubtotal(): number { return cache.reduce((s, i) => s + i.price * i.qty, 0) }

export function addToCart(p: Product, size: string, qty = 1) {
  const next = cache.map(i => ({ ...i }))
  const found = next.find(i => i.id === p.id && i.size === size)
  if (found) found.qty += qty
  else next.push({ id: p.id, name: p.name, price: p.price, img: p.img, size, qty })
  commit(next)
}

export function setQty(id: string, size: string, qty: number) {
  commit(
    qty <= 0
      ? cache.filter(i => !(i.id === id && i.size === size))
      : cache.map(i => (i.id === id && i.size === size ? { ...i, qty } : i)),
  )
}

export function removeItem(id: string, size: string) {
  commit(cache.filter(i => !(i.id === id && i.size === size)))
}

export function clearCart() { commit([]) }

/** React binding — re-renders when the cart changes. */
export function useCart(): CartItem[] {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => { listeners.delete(cb) } },
    () => cache,
  )
}

/** Initialize a Korapay charge on the backend and redirect to its checkout page. */
export async function startCheckout(email: string): Promise<void> {
  if (!cache.length) throw new Error('Your bag is empty.')
  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: cache, email }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Could not start checkout.')
  if (!data.url) throw new Error('No checkout URL returned.')
  window.location.href = data.url
}
