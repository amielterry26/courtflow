import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const CATEGORIES = [
  { value: 'warmup', label: 'Warm-Up' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'strength & conditioning', label: 'Strength & Conditioning' },
  { value: 'defense', label: 'Defense' },
  { value: 'footwork', label: 'Footwork' },
  { value: 'finishing', label: 'Finishing' },
  { value: 'shooting', label: 'Shooting' },
  { value: 'ball handling', label: 'Ball Handling' },
  { value: 'live action', label: 'Live Action' },
]

const DIFF_COLORS = {
  beginner: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400',
  intermediate: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
  advanced: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400',
}

export default function Drills() {
  const [drills, setDrills] = useState([])
  const [selectedCats, setSelectedCats] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('drills').select('*').order('title').then(({ data }) => {
      setDrills(data ?? [])
      setLoading(false)
    })
  }, [])

  function toggleCategory(value) {
    setSelectedCats(prev =>
      prev.includes(value) ? prev.filter(c => c !== value) : [...prev, value]
    )
  }

  const nothingSelected = selectedCats.length === 0 && !search

  const filtered = drills.filter(d => {
    const matchCat = selectedCats.length === 0 || selectedCats.includes(d.category)
    const matchSearch = (d.title ?? '').toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  if (loading) return <PageLoading />

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Drills</h1>
        <Link
          to="/drills/new"
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + Drill
        </Link>
      </div>

      <input
        type="search"
        placeholder="Search drills..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Category filters — wrap onto multiple lines */}
      <div className="flex flex-wrap gap-2 mb-4">
        {CATEGORIES.map(({ value, label }) => {
          const isActive = selectedCats.includes(value)
          return (
            <button
              key={value}
              onClick={() => toggleCategory(value)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {nothingSelected ? (
        <div className="text-center py-16 text-zinc-400 dark:text-zinc-600">
          <div className="text-4xl mb-3">🏀</div>
          <p className="font-medium text-zinc-500 dark:text-zinc-400">Select a category to browse drills</p>
          <p className="text-sm mt-1 text-zinc-400 dark:text-zinc-500">Or search by name above</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 dark:text-zinc-600">
          <div className="text-4xl mb-3">🏀</div>
          <p className="font-medium">No results</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(d => (
            <Link key={d.id} to={`/drills/${d.id}`} className="block">
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-3 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{d.title}</p>
                  {d.difficulty && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFF_COLORS[d.difficulty]}`}>
                      {d.difficulty}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-2 py-0.5 rounded-full capitalize">
                    {d.category}
                  </span>
                  {d.reps_or_time && (
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">{d.reps_or_time}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function PageLoading() {
  return <div className="flex items-center justify-center py-20 text-zinc-400 text-sm">Loading...</div>
}
