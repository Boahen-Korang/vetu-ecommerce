import { useEffect, useRef, useState, type CSSProperties } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export type Loc = { lat: number; lng: number; address: string; city: string; region: string }

const pinIcon = L.divIcon({
  className: '',
  html: '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:#d4af7a;border:2px solid #060606;transform:rotate(-45deg);box-shadow:0 4px 10px rgba(0,0,0,.6)"></div>',
  iconSize: [22, 22], iconAnchor: [11, 22],
})

type Geo = { address: string; city: string; region: string }
type Suggestion = Geo & { lat: number; lng: number; label: string }

/* eslint-disable @typescript-eslint/no-explicit-any */
function fromProps(p: any): Geo & { label: string } {
  const street = [p.housenumber, p.street].filter(Boolean).join(' ')
  const name = p.name && p.name !== p.street ? p.name : ''
  const area = p.district || p.suburb || p.neighbourhood || p.locality || ''
  const address = [street || name, area].filter(Boolean).join(', ') || name || ''
  const city = p.city || p.town || p.village || p.county || ''
  const region = p.state || ''
  const label = [name || street, area, city, region].filter(Boolean).join(', ')
  return { address, city, region, label }
}

// Photon (Komoot) — free OpenStreetMap geocoder, no API key. Biased toward Accra.
async function photonSearch(q: string): Promise<Suggestion[]> {
  try {
    const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=en&lat=5.6037&lon=-0.187`)
    const d = await r.json()
    return (d.features || []).map((f: any) => {
      const [lng, lat] = f.geometry.coordinates
      const g = fromProps(f.properties)
      return { lat, lng, ...g, label: g.label || `${lat.toFixed(4)}, ${lng.toFixed(4)}` }
    })
  } catch { return [] }
}
async function photonReverse(lat: number, lng: number): Promise<Geo> {
  try {
    const r = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&lang=en`)
    const d = await r.json()
    const f = (d.features || [])[0]
    if (f) { const { address, city, region } = fromProps(f.properties); return { address, city, region } }
  } catch { /* ignore */ }
  return { address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, city: '', region: '' }
}

const labelStyle: CSSProperties = { fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#c9b99a' }
const searchStyle: CSSProperties = { width: '100%', boxSizing: 'border-box', fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: '#f0ece4', background: 'rgba(240,236,228,0.04)', border: '1px solid rgba(240,236,228,0.14)', padding: '11px 13px', outline: 'none' }

export default function LocationPicker({ value, onChange }: { value: Loc | null; onChange: (l: Loc) => void }) {
  const elRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!elRef.current || mapRef.current) return
    const start: [number, number] = value ? [value.lat, value.lng] : [5.6037, -0.187] // Accra
    const map = L.map(elRef.current, { zoomControl: true }).setView(start, value ? 15 : 12)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { subdomains: 'abcd', maxZoom: 20, attribution: '© OpenStreetMap · © CARTO' }).addTo(map)
    const marker = L.marker(start, { draggable: true, icon: pinIcon }).addTo(map)
    mapRef.current = map
    markerRef.current = marker

    const commit = (lat: number, lng: number) => {
      onChange({ lat, lng, address: '', city: '', region: '' })
      photonReverse(lat, lng).then(g => onChange({ lat, lng, ...g }))
    }
    marker.on('dragend', () => { const p = marker.getLatLng(); commit(p.lat, p.lng) })
    map.on('click', (e: L.LeafletMouseEvent) => { marker.setLatLng(e.latlng); commit(e.latlng.lat, e.latlng.lng) })
    setTimeout(() => map.invalidateSize(), 250)

    return () => { map.remove(); mapRef.current = null; markerRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onSearchChange = (q: string) => {
    setQuery(q)
    if (timer.current) clearTimeout(timer.current)
    if (q.trim().length < 3) { setSuggestions([]); return }
    timer.current = window.setTimeout(async () => setSuggestions(await photonSearch(q.trim())), 300)
  }
  const pick = (s: Suggestion) => {
    setQuery(s.label); setSuggestions([])
    mapRef.current?.setView([s.lat, s.lng], 16)
    markerRef.current?.setLatLng([s.lat, s.lng])
    onChange({ lat: s.lat, lng: s.lng, address: s.address, city: s.city, region: s.region })
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) { setStatus('Geolocation isn’t supported — search or pin manually.'); return }
    setStatus('Locating…')
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        setStatus('')
        mapRef.current?.setView([lat, lng], 16)
        markerRef.current?.setLatLng([lat, lng])
        onChange({ lat, lng, address: '', city: '', region: '' })
        onChange({ lat, lng, ...(await photonReverse(lat, lng)) })
      },
      () => setStatus('Couldn’t get your location — search or drop the pin instead.'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
        <label style={labelStyle}>Search or pin your delivery location</label>
        <button type="button" onClick={useMyLocation} className="font-mono-dm"
          style={{ fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#060606', background: '#d4af7a', border: 'none', padding: '8px 13px', cursor: 'pointer' }}>
          ⌖ Use my location
        </button>
      </div>

      <div style={{ position: 'relative', zIndex: 500 }}>
        <input value={query} onChange={e => onSearchChange(e.target.value)} placeholder="Search your area, street or landmark" style={searchStyle} autoComplete="off" />
        {suggestions.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#111010', border: '1px solid rgba(240,236,228,0.15)', boxShadow: '0 14px 34px rgba(0,0,0,0.55)', marginTop: 2, maxHeight: 240, overflowY: 'auto' }}>
            {suggestions.map((s, i) => (
              <button key={i} type="button" onClick={() => pick(s)} className="font-mono-dm"
                style={{ display: 'block', width: '100%', textAlign: 'left', fontSize: 12.5, color: 'rgba(240,236,228,0.75)', background: 'none', border: 'none', borderTop: i ? '1px solid rgba(240,236,228,0.08)' : 'none', padding: '10px 12px', cursor: 'pointer', lineHeight: 1.4 }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(240,236,228,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div ref={elRef} style={{ height: 250, width: '100%', borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(240,236,228,0.14)', background: '#0e0e0e', marginTop: 10 }} />
      <p className="font-mono-dm" style={{ fontSize: 10.5, letterSpacing: '0.03em', color: status ? '#e0806a' : 'rgba(240,236,228,0.5)', margin: '8px 0 0', lineHeight: 1.5 }}>
        {status || (value ? `📍 ${value.address || `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`}` : 'Search, tap the map, or use your location — the address fills in automatically.')}
      </p>
    </div>
  )
}
