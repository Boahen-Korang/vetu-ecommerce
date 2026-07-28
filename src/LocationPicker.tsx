import { useEffect, useRef, useState, type CSSProperties } from 'react'

export type Loc = { lat: number; lng: number; address: string; city: string; region: string }

const KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined

// Dark "night" map style so it fits the VÊTU theme.
const DARK = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a1a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9a9a9a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#b3b3b3' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3a3a3a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#8a8472' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#18241a' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
]

let loadPromise: Promise<void> | null = null
function loadGoogle(): Promise<void> {
  if ((window as { google?: unknown }).google) return Promise.resolve()
  if (loadPromise) return loadPromise
  loadPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}&libraries=places&loading=async&v=weekly`
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Google Maps failed to load'))
    document.head.appendChild(s)
  })
  return loadPromise
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const comp = (components: any[], type: string): string =>
  components?.find((c: any) => c.types.includes(type))?.long_name || ''
function parse(components: any[]): { address: string; city: string; region: string } {
  const street = [comp(components, 'street_number'), comp(components, 'route')].filter(Boolean).join(' ')
  const area = comp(components, 'neighborhood') || comp(components, 'sublocality') || comp(components, 'sublocality_level_1') || ''
  const city = comp(components, 'locality') || comp(components, 'administrative_area_level_2') || comp(components, 'postal_town') || ''
  const region = comp(components, 'administrative_area_level_1') || ''
  return { address: [street, area].filter(Boolean).join(', '), city, region }
}

const labelStyle: CSSProperties = { fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#c9b99a' }
const searchStyle: CSSProperties = { width: '100%', boxSizing: 'border-box', fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: '#f0ece4', background: 'rgba(240,236,228,0.04)', border: '1px solid rgba(240,236,228,0.14)', padding: '11px 13px', outline: 'none' }

export default function LocationPicker({ value, onChange }: { value: Loc | null; onChange: (l: Loc) => void }) {
  const mapEl = useRef<HTMLDivElement>(null)
  const inputEl = useRef<HTMLInputElement>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const geocoderRef = useRef<any>(null)
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!KEY || !mapEl.current) return
    let cancelled = false
    loadGoogle().then(() => {
      if (cancelled || !mapEl.current) return
      const g = (window as any).google
      const center = value ? { lat: value.lat, lng: value.lng } : { lat: 5.6037, lng: -0.187 } // Accra
      const map = new g.maps.Map(mapEl.current, {
        center, zoom: value ? 15 : 12, styles: DARK,
        mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
      })
      const marker = new g.maps.Marker({
        map, position: center, draggable: true,
        icon: { path: g.maps.SymbolPath.CIRCLE, scale: 9, fillColor: '#d4af7a', fillOpacity: 1, strokeColor: '#060606', strokeWeight: 2 },
      })
      const geocoder = new g.maps.Geocoder()
      mapRef.current = map; markerRef.current = marker; geocoderRef.current = geocoder

      const commit = (lat: number, lng: number) => {
        onChange({ lat, lng, address: '', city: '', region: '' })
        geocoder.geocode({ location: { lat, lng } }, (res: any[], st: string) => {
          if (st === 'OK' && res[0]) onChange({ lat, lng, ...parse(res[0].address_components) })
        })
      }
      marker.addListener('dragend', () => { const p = marker.getPosition(); commit(p.lat(), p.lng()) })
      map.addListener('click', (e: any) => { marker.setPosition(e.latLng); commit(e.latLng.lat(), e.latLng.lng()) })

      if (inputEl.current) {
        const ac = new g.maps.places.Autocomplete(inputEl.current, { fields: ['geometry', 'address_components'], componentRestrictions: { country: 'gh' } })
        ac.bindTo('bounds', map)
        ac.addListener('place_changed', () => {
          const p = ac.getPlace()
          if (!p.geometry) return
          const loc = p.geometry.location
          map.setCenter(loc); map.setZoom(16); marker.setPosition(loc)
          onChange({ lat: loc.lat(), lng: loc.lng(), ...parse(p.address_components || []) })
        })
      }
    }).catch(() => setStatus('Couldn’t load the map — enter your address manually.'))
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const useMyLocation = () => {
    if (!navigator.geolocation) { setStatus('Geolocation isn’t supported — search or pin manually.'); return }
    setStatus('Locating…')
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        setStatus('')
        if (mapRef.current && markerRef.current) { mapRef.current.setCenter({ lat, lng }); mapRef.current.setZoom(16); markerRef.current.setPosition({ lat, lng }) }
        onChange({ lat, lng, address: '', city: '', region: '' })
        geocoderRef.current?.geocode({ location: { lat, lng } }, (res: any[], st: string) => {
          if (st === 'OK' && res[0]) onChange({ lat, lng, ...parse(res[0].address_components) })
        })
      },
      () => setStatus('Couldn’t get your location — search or drop the pin instead.'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  if (!KEY) {
    return (
      <p className="font-mono-dm" style={{ fontSize: 11, color: 'rgba(240,236,228,0.45)', lineHeight: 1.7 }}>
        Map isn’t set up yet — enter your address in the fields above. (Add <span style={{ color: '#c9b99a' }}>VITE_GOOGLE_MAPS_API_KEY</span> to enable the live map.)
      </p>
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
      <input ref={inputEl} placeholder="Search your area, street or landmark" style={searchStyle} />
      <div ref={mapEl} style={{ height: 260, width: '100%', borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(240,236,228,0.14)', background: '#0e0e0e', marginTop: 10 }} />
      <p className="font-mono-dm" style={{ fontSize: 10.5, letterSpacing: '0.03em', color: status ? '#e0806a' : 'rgba(240,236,228,0.5)', margin: '8px 0 0', lineHeight: 1.5 }}>
        {status || (value ? `📍 ${value.address || `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`}` : 'Search, tap the map, or use your location — the address fills in automatically.')}
      </p>
    </div>
  )
}
