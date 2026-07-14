import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Today() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          session_athletes ( athlete:athletes(id, first_name, last_name) ),
          session_drills ( *, drill:drills(title, category) )
        `)
        .eq('session_date', today)
        .order('start_time', { ascending: true })

      if (!error) setSessions(data ?? [])
      setLoading(false)
    }
    load()
  }, [today])

  if (loading) return <PageLoading />

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Today</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <Link to="/schedule" className="text-xs text-blue-500 mt-0.5 inline-block">Week view →</Link>
        </div>
        <Link
          to="/sessions/new"
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + Session
        </Link>
      </div>

      {sessions.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {sessions.map(session => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  )
}

function SessionCard({ session }) {
  const athletes = session.session_athletes?.map(sa => sa.athlete) ?? []
  const drills = [...(session.session_drills ?? [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))

  return (
    <Link to={`/sessions/${session.id}`} className="block">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">{session.session_title}</h2>
            {(session.start_time || session.end_time) && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {formatTime(session.start_time)}{session.end_time ? ` – ${formatTime(session.end_time)}` : ''}
              </p>
            )}
          </div>
          <span className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full font-medium">
            {drills.length} drill{drills.length !== 1 ? 's' : ''}
          </span>
        </div>

        {athletes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {athletes.map(a => a && (
              <span key={a.id} className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded-full">
                {a.first_name} {a.last_name}
              </span>
            ))}
          </div>
        )}

        {drills.length > 0 && (
          <ol className="space-y-1">
            {drills.map((sd, i) => (
              <li key={sd.id} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <span className="text-xs text-zinc-400 dark:text-zinc-600 w-4">{i + 1}.</span>
                <span>{sd.drill?.title}</span>
                {sd.duration_minutes && (
                  <span className="text-xs text-zinc-400 ml-auto">{sd.duration_minutes}m</span>
                )}
              </li>
            ))}
          </ol>
        )}

        {session.notes && (
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800 pt-3">
            {session.notes}
          </p>
        )}
      </div>
    </Link>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-16 text-zinc-400 dark:text-zinc-600">
      <div className="text-4xl mb-3">🏀</div>
      <p className="font-medium">No sessions today</p>
      <p className="text-sm mt-1">
        <Link to="/sessions/new" className="text-blue-500 hover:underline">Create one</Link>
      </p>
    </div>
  )
}

function PageLoading() {
  return (
    <div className="flex items-center justify-center py-20 text-zinc-400 text-sm">
      Loading...
    </div>
  )
}

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  const ampm = hr >= 12 ? 'PM' : 'AM'
  const display = hr % 12 || 12
  return `${display}:${m} ${ampm}`
}
