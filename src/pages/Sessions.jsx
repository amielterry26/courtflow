import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Sessions() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('sessions')
      .select('*, session_athletes(athlete:athletes(first_name, last_name)), session_drills(id)')
      .order('session_date', { ascending: false })
      .then(({ data }) => {
        setSessions(data ?? [])
        setLoading(false)
      })
  }, [])

  if (loading) return <PageLoading />

  // Group by date
  const grouped = sessions.reduce((acc, s) => {
    const key = s.session_date
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {})

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))
  const today = new Date().toISOString().split('T')[0]

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Sessions</h1>
        <Link
          to="/sessions/new"
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + Session
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 dark:text-zinc-600">
          <div className="text-4xl mb-3">📋</div>
          <p className="font-medium">No sessions yet</p>
          <p className="text-sm mt-1">
            <Link to="/sessions/new" className="text-blue-500 hover:underline">Create your first session</Link>
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map(date => (
            <div key={date}>
              <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-2">
                {date === today ? 'Today' : formatDate(date)}
              </p>
              <div className="space-y-2">
                {grouped[date].map(s => (
                  <Link key={s.id} to={`/sessions/${s.id}`} className="block">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-3 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">{s.session_title}</p>
                        <span className="text-xs text-zinc-400">{s.session_drills?.length ?? 0} drills</span>
                      </div>
                      {s.start_time && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{formatTime(s.start_time)}</p>
                      )}
                      {s.session_athletes?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {s.session_athletes.map((sa, i) => sa.athlete && (
                            <span key={i} className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-2 py-0.5 rounded-full">
                              {sa.athlete.first_name} {sa.athlete.last_name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric'
  })
}

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
}

function PageLoading() {
  return <div className="flex items-center justify-center py-20 text-zinc-400 text-sm">Loading...</div>
}
