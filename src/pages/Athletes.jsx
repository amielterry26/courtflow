import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const SKILL_COLORS = {
  beginner: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400',
  intermediate: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
  advanced: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400',
}

const GRADES = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

export default function Athletes() {
  const [athletes, setAthletes] = useState([])
  const [search, setSearch] = useState('')
  const [filterGrade, setFilterGrade] = useState('')
  const [filterAge, setFilterAge] = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('athletes')
      .select('*, session_athletes(id)')
      .eq('status', 'active')
      .order('last_name')
      .then(({ data }) => {
        setAthletes(data ?? [])
        setLoading(false)
      })
  }, [])

  // Unique ages from data
  const ages = [...new Set(athletes.map(a => a.age).filter(Boolean))].sort((a, b) => a - b)

  const filtered = athletes.filter(a => {
    const matchSearch = `${a.first_name} ${a.last_name} ${a.school ?? ''} ${a.team ?? ''}`.toLowerCase().includes(search.toLowerCase())
    const matchGrade = !filterGrade || a.grade === filterGrade
    const matchAge = !filterAge || String(a.age) === filterAge
    const matchGender = !filterGender || a.gender === filterGender
    return matchSearch && matchGrade && matchAge && matchGender
  })

  const hasFilters = search || filterGrade || filterAge || filterGender

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
        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Filter row */}
      <div className="flex gap-2 mb-4">
        <select
          value={filterGender}
          onChange={e => setFilterGender(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>

        <select
          value={filterGrade}
          onChange={e => setFilterGrade(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Grade</option>
          {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
        </select>

        <select
          value={filterAge}
          onChange={e => setFilterAge(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Age</option>
          {ages.map(a => <option key={a} value={a}>{a} yrs</option>)}
        </select>
      </div>

      {/* Clear filters */}
      {hasFilters && (
        <button
          onClick={() => { setSearch(''); setFilterGrade(''); setFilterAge(''); setFilterGender('') }}
          className="text-xs text-blue-500 mb-3 hover:underline"
        >
          Clear filters
        </button>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 dark:text-zinc-600">
          <div className="text-4xl mb-3">👤</div>
          <p className="font-medium">{hasFilters ? 'No results' : 'No athletes yet'}</p>
          {!hasFilters && (
            <p className="text-sm mt-1">
              <Link to="/athletes/new" className="text-blue-500 hover:underline">Add your first athlete</Link>
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => {
            const sessionCount = a.session_athletes?.length ?? 0
            return (
              <Link key={a.id} to={`/athletes/${a.id}`} className="block">
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center gap-3 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm flex-shrink-0">
                    {a.first_name?.[0] ?? '?'}{a.last_name?.[0] ?? ''}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{a.first_name} {a.last_name}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      {[a.position, a.school, a.grade ? `Gr. ${a.grade}` : null, a.age ? `${a.age}y` : null].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {sessionCount > 0 && (
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">{sessionCount} sessions</span>
                    )}
                    {a.skill_level && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SKILL_COLORS[a.skill_level]}`}>
                        {a.skill_level}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PageLoading() {
  return <div className="flex items-center justify-center py-20 text-zinc-400 text-sm">Loading...</div>
}
