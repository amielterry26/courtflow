import { useEffect, useRef, useState } from 'react'

// Type-ahead for gyms/addresses (free OpenStreetMap search via Photon, biased to Las Vegas).
// Picking a result fills in the name + full address; the map below confirms the pin.
const VEGAS = 'lat=36.17&lon=-115.14'

function formatAddress(p) {
  const street = [p.housenumber, p.street].filter(Boolean).join(' ')
  return [street, p.city || p.county, [p.state, p.postcode].filter(Boolean).join(' ')].filter(Boolean).join(', ')
}

export default function PlaceSearch({ name, address, onChange }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    clearTimeout(timer.current)
    if (query.trim().length < 3) return setResults([])
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=8&${VEGAS}&lang=en`)
        const { features } = await res.json()
        // Nevada first, then the rest of the US
        const us = features.filter(f => f.properties.countrycode === 'US')
        us.sort((a, b) => (b.properties.state === 'Nevada') - (a.properties.state === 'Nevada'))
        setResults(us.slice(0, 5).map(f => ({
          name: f.properties.name ?? '',
          address: formatAddress(f.properties),
        })).filter(r => r.address))
        setOpen(true)
      } catch {
        setResults([])
      }
    }, 300)
    return () => clearTimeout(timer.current)
  }, [query])

  function pick(r) {
    onChange({ name: name || r.name, address: r.address })
    setQuery('')
    setOpen(false)
  }

  const mapQuery = [name, address].filter(Boolean).join(', ')

  return (
    <div className="space-y-2">
      <div className="relative">
        <input className="input" placeholder="🔎 Search a gym or address…" value={query}
          onChange={e => setQuery(e.target.value)} onFocus={() => results.length && setOpen(true)} />
        {open && results.length > 0 && (
          <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
            {results.map((r, i) => (
              <button type="button" key={i} onClick={() => pick(r)}
                className="block w-full border-b border-line px-3 py-2.5 text-left last:border-0 hover:bg-raised">
                {r.name && <p className="truncate text-sm font-semibold">{r.name}</p>}
                <p className="truncate text-xs text-muted">{r.address}</p>
              </button>
            ))}
          </div>
        )}
      </div>
      <input required className="input" placeholder="Location name (e.g. Atlas Hoops)" value={name}
        onChange={e => onChange({ name: e.target.value, address })} />
      <input className="input" placeholder="Full address" value={address}
        onChange={e => onChange({ name, address: e.target.value })} />
      {address && (
        <iframe title="Map preview" loading="lazy"
          src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=15&output=embed`}
          className="h-44 w-full rounded-xl border border-line dark:[filter:invert(0.9)_hue-rotate(180deg)]" />
      )}
      {address && <p className="text-xs text-muted">Check the pin. That's where Directions will send people.</p>}
    </div>
  )
}
