import { useEffect, useRef, useState, type CSSProperties } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export type Loc = { lat: number; lng: number; address: string }

// A simple teardrop pin as an HTML divIcon (avoids Leaflet's bundler icon-path issue).
const pinIcon = L.divIcon({
  className: '',
  html: '<div style="width:20px;height:20px;border-radius:50% 50% 50% 0;background:#d4af7a;border:2px solid #060606;transform:rotate(-45deg);box-shadow:0 3px 8px rgba(0,0,0,.55)"></div>',
  iconSize: [20, 20], iconAnchor: [10, 20],
})

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, { headers: { Accept: 'application/json' } })
    const d = await r.json()
    return d.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  }
}

const labelStyle: CSSProperties = { fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#c9b99a' }

export default function LocationPicker({ value, onChange }: { value: Loc | null; onChange: (l: Loc) => void }) {
  const elRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!elRef.current || mapRef.current) return
    const start: [number, number] = value ? [value.lat, value.lng] : [5.6037, -0.187] // Accra
    const map = L.map(elRef.current, { attributionControl: false }).setView(start, value ? 15 : 12)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
    const marker = L.marker(start, { draggable: true, icon: pinIcon }).addTo(map)
    mapRef.current = map
    markerRef.current = marker

    const commit = (lat: number, lng: number) => {
      onChange({ lat, lng, address: '' })
      reverseGeocode(lat, lng).then(address => onChange({ lat, lng, address }))
    }
    marker.on('dragend', () => { const p = marker.getLatLng(); commit(p.lat, p.lng) })
    map.on('click', (e: L.LeafletMouseEvent) => { marker.setLatLng(e.latlng); commit(e.latlng.lat, e.latlng.lng) })
    setTimeout(() => map.invalidateSize(), 250) // ensure correct size after layout

    return () => { map.remove(); mapRef.current = null; markerRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const useMyLocation = () => {
    if (!navigator.geolocation) { setStatus('Geolocation isn’t supported — drop the pin manually.'); return }
    setStatus('Locating…')
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        mapRef.current?.setView([lat, lng], 16)
        markerRef.current?.setLatLng([lat, lng])
        setStatus('')
        onChange({ lat, lng, address: '' })
        reverseGeocode(lat, lng).then(address => onChange({ lat, lng, address }))
      },
      () => setStatus('Couldn’t get your location — drop the pin on the map instead.'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
        <label style={labelStyle}>Pin your delivery location</label>
        <button type="button" onClick={useMyLocation} className="font-mono-dm"
          style={{ fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#060606', background: '#d4af7a', border: 'none', padding: '8px 12px', cursor: 'pointer' }}>
          ⌖ Use my location
        </button>
      </div>
      <div ref={elRef} style={{ height: 230, width: '100%', border: '1px solid rgba(240,236,228,0.14)', background: '#0e0e0e' }} />
      <p className="font-mono-dm" style={{ fontSize: 10.5, letterSpacing: '0.03em', color: status ? '#e0806a' : 'rgba(240,236,228,0.45)', margin: '8px 0 0', lineHeight: 1.5 }}>
        {status || (value ? `📍 ${value.address || `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`}` : 'Tap the map or drag the pin to set where we deliver.')}
      </p>
    </div>
  )
}
