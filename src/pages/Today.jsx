import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function getWeekBounds() {
  const now = new Date()
  const day = now.getDay() // 0 = Sun
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((day + 6) % 7))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return [monday.toISOString().split('T')[0], sunday.toISOString().split('T')[0]]
}

export default function Today() {
  const [sessions, setSessions] = useState([])
  const [stats, setStats] = useState({ athletes: 0, weekSessions: 0 })
  const [recentAthletes, setRecentAthletes] = useState([])
  const [loading, setLoading] = useState(true)

  const today = new Date().toISOString().split('T')[0]
  const [weekStart, weekEnd] = getWeekBounds()

  useEffect(() => {
    async function load() {
      const [sessionsRes, athleteCountRes, weekRes, recentRes] = await Promise.all([
        supabase
          .from('sessions')
          .select('*, session_athletes(athlete:athletes(id, first_name, last_name)), session_drills(*, drill:drills(title, category))')
          .eq('session_date', today)
          .order('start_time', { ascending: true }),
        supabase.from('athletes').select('id', { count: 'exact' }).eq('status', 'active'),
        supabase.from('sessions').select('id', { count: 'exact' }).gte('session_date', weekStart).lte('session_date', weekEnd),
        supabase.from('athletes').select('id, first_name, last_name, skill_level').eq('status', 'active').order('created_at', { ascending: false }).limit(4),
      ])

      setSessions(sessionsRes.data ?? [])
      setStats({
        athletes: athleteCountRes.count ?? 0,
        weekSessions: weekRes.count ?? 0,
      })
      setRecentAthletes(recentRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [today, weekStart, weekEnd])

  if (loading) return <PageLoading />

  return (
    <div>
      {/* Header */}
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

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <Link to="/athletes" className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-3 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.athletes}</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Active athletes</p>
        </Link>
        <Link to="/sessions" className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-3 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.weekSessions}</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Sessions this week</p>
        </Link>
      </div>

      {/* Today's sessions */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-3">
          {sessions.length > 0 ? `${sessions.length} session${sessions.length !== 1 ? 's' : ''} today` : 'No sessions today'}
        </p>
        {sessions.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 text-center">
            <p className="text-sm text-zinc-400 mb-2">Nothing scheduled for today</p>
            <Link to="/sessions/new" className="text-sm text-blue-500 font-medium">Create a session →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(session => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>

      {/* Recent athletes */}
      {recentAthletes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Recent athletes</p>
            <Link to="/athletes" className="text-xs text-blue-500">View all →</Link>
          </div>
          <div className="space-y-2">
            {recentAthletes.map(a => (
              <Link key={a.id} to={`/athletes/${a.id}`} className="block">
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center gap-3 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs flex-shrink-0">
                    {a.first_name?.[0]}{a.last_name?.[0]}
                  </div>
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{a.first_name} {a.last_name}</p>
                  {a.skill_level && (
                    <span className="ml-auto text-xs text-zinc-400 capitalize">{a.skill_level}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
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
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
}
