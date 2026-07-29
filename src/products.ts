// ─── Product catalog ─────────────────────────────────────────────────────────
// Products live in the database (server), so an admin upload is visible to every
// customer on every device. fetchProducts() reads the public catalog; the admin
// mutations require the admin passcode.

import { adminPasscode } from './adminAuth'

export type Category = 'Outerwear' | 'Knitwear' | 'Tailoring' | 'Dresses'

export type Product = {
  id: string
  name: string
  subtitle: string   // colourway / short descriptor
  price: number
  category: Category
  tag: string
  img: string
  alt: string
  sizes: string[]
}

export const CATEGORIES = ['All', 'Outerwear', 'Knitwear', 'Tailoring', 'Dresses'] as const
export type Filter = (typeof CATEGORIES)[number]

export const formatPrice = (n: number) => '₵' + n.toLocaleString('en-US')

export function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'piece'
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function normalize(p: any): Product {
  return {
    id: String(p.id), name: String(p.name || ''), subtitle: String(p.subtitle || ''),
    price: Number(p.price) || 0, category: p.category, tag: String(p.tag || ''),
    img: String(p.img || ''), alt: String(p.alt || ''), sizes: Array.isArray(p.sizes) ? p.sizes : [],
  }
}

/** Public catalog — every customer sees the same products. */
export async function fetchProducts(): Promise<Product[]> {
  try {
    const r = await fetch('/api/products')
    if (!r.ok) return []
    const d = await r.json()
    return Array.isArray(d.products) ? d.products.map(normalize) : []
  } catch {
    return []
  }
}

/** Add or update a product (admin). */
export async function createProduct(p: Product): Promise<void> {
  const r = await fetch('/api/admin/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-passcode': adminPasscode() },
    body: JSON.stringify(p),
  })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Could not save product.')
}

/** Delete a product (admin). */
export async function deleteProduct(id: string): Promise<void> {
  const r = await fetch('/api/admin/products/' + encodeURIComponent(id), {
    method: 'DELETE',
    headers: { 'x-admin-passcode': adminPasscode() },
  })
  if (!r.ok) throw new Error('Could not delete product.')
}
