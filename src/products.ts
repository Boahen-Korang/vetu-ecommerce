// ─── Product catalog ─────────────────────────────────────────────────────────
// Single source of truth for items shown on the shop page. The customer-facing
// catalog is the DEFAULT_PRODUCTS below MERGED with anything an admin/upload
// flow has saved to localStorage under STORAGE_KEY — so uploaded clothes show
// up for sale here without any backend. Swap loadProducts() for an API fetch
// when a server is added.

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

const STORAGE_KEY = 'vetu_products'

// No demo/seed products — the catalog is whatever the admin uploads.
export const DEFAULT_PRODUCTS: Product[] = []

function isProduct(x: unknown): x is Product {
  const p = x as Product
  return !!p && typeof p.id === 'string' && typeof p.name === 'string' &&
    typeof p.price === 'number' && typeof p.img === 'string'
}

/** Items an admin has uploaded (persisted to localStorage). */
export function loadUploaded(): Product[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.filter(isProduct)
    }
  } catch {
    /* storage unavailable / malformed */
  }
  return []
}

function saveUploaded(list: Product[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

/** Add (or replace by id) an uploaded product. May throw on storage quota. */
export function addProduct(p: Product) {
  const list = loadUploaded().filter(x => x.id !== p.id)
  saveUploaded([p, ...list])
}

/** Remove an uploaded product by id. */
export function removeProduct(id: string) {
  saveUploaded(loadUploaded().filter(p => p.id !== id))
}

/**
 * Customer-facing catalog: uploaded items first, then the default collection,
 * de-duplicated by id. Returns defaults if nothing was uploaded.
 */
export function loadProducts(): Product[] {
  const uploaded = loadUploaded()
  const seen = new Set(uploaded.map(p => p.id))
  return [...uploaded, ...DEFAULT_PRODUCTS.filter(p => !seen.has(p.id))]
}

export const formatPrice = (n: number) => '₵' + n.toLocaleString('en-US')

export function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'piece'
}
