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

const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=700&h=900&fit=crop&auto=format&q=90`

const OUTER_SIZES = ['XS', 'S', 'M', 'L', 'XL']
const DRESS_SIZES = ['XS', 'S', 'M', 'L']

export const DEFAULT_PRODUCTS: Product[] = [
  { id: 'overcoat', name: 'The Overcoat', subtitle: 'Obsidian', price: 1240, category: 'Outerwear', tag: 'OUTERWEAR', img: img('1539109136881-3be0616acf4b'), alt: 'Model in long obsidian overcoat, architectural silhouette', sizes: OUTER_SIZES },
  { id: 'archive-coat', name: 'The Archive Coat', subtitle: 'Camel', price: 880, category: 'Outerwear', tag: 'OUTERWEAR', img: img('1496747611176-843222e1e57c'), alt: 'The Archive Coat — asymmetric lapel, raw hem', sizes: OUTER_SIZES },
  { id: 'cashmere-coat', name: 'The Travelling Coat', subtitle: 'Stone', price: 1090, category: 'Outerwear', tag: 'OUTERWEAR', img: img('1509631179647-0177331693ae'), alt: 'Model in cashmere coat on a deserted road', sizes: OUTER_SIZES },
  { id: 'cashmere-crew', name: 'The Cashmere Crew', subtitle: 'Oat', price: 320, category: 'Knitwear', tag: 'KNITWEAR', img: img('1434389677669-e08b4cac3105'), alt: 'Soft oat cashmere crew-neck knit', sizes: OUTER_SIZES },
  { id: 'ribbed-knit', name: 'The Ribbed Knit', subtitle: 'Charcoal', price: 280, category: 'Knitwear', tag: 'KNITWEAR', img: img('1487222477894-8943e31ef7b2'), alt: 'Monochromatic ribbed knitwear, close texture', sizes: OUTER_SIZES },
  { id: 'tailored-blazer', name: 'The Tailored Blazer', subtitle: 'Charcoal', price: 890, category: 'Tailoring', tag: 'TAILORING', img: img('1550614000-4895a10e1bfd'), alt: 'Sharply tailored charcoal blazer editorial', sizes: OUTER_SIZES },
  { id: 'editorial-suit', name: 'The Editorial Suit', subtitle: 'Ink', price: 760, category: 'Tailoring', tag: 'TAILORING', img: img('1558769132-cb1aea458c5e'), alt: 'Model in structured editorial suit', sizes: OUTER_SIZES },
  { id: 'column-dress', name: 'The Column Dress', subtitle: 'Ivory', price: 680, category: 'Dresses', tag: 'EVENINGWEAR', img: img('1515886657613-9f3515b0c78f'), alt: 'Model in minimal ivory column dress', sizes: DRESS_SIZES },
]

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
