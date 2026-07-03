import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const SKILL_COLORS = {
  beginner: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400',
  intermediate: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
  advanced: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400',
}

export default function Athletes() {
  const [athletes, setAthletes] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('athletes')
      .select('*')
      .eq('status', 'active')
      .order('last_name')
      .then(({ data }) => {
        setAthletes(data ?? [])
        setLoading(false)
      })
  }, [])

  const filtered = athletes.filter(a =>
    `${a.first_name} ${a.last_name} ${a.school ?? ''} ${a.team ?? ''}`.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <PageLoading />

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Athletes</h1>
        <Link
          to="/athletes/new"
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + Athlete
        </Link>
      </div>

      <input
        type="search"
        placeholder="Search athletes..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 dark:text-zinc-600">
          <div className="text-4xl mb-3">👤</div>
          <p className="font-medium">{search ? 'No results' : 'No athletes yet'}</p>
          {!search && (
            <p className="text-sm mt-1">
              <Link to="/athletes/new" className="text-blue-500 hover:underline">Add your first athlete</Link>
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => (
            <Link key={a.id} to={`/athletes/${a.id}`} className="block">
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center gap-3 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm flex-shrink-0">
                  {a.first_name[0]}{a.last_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{a.first_name} {a.last_name}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    {[a.position, a.school, a.grade ? `Grade ${a.grade}` : null].filter(Boolean).join(' · ')}
                  </p>
                </div>
                {a.skill_level && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${SKILL_COLORS[a.skill_level]}`}>
                    {a.skill_level}
                  </span>
                )}
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
