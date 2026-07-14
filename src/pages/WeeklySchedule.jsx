import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function WeeklySchedule() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  const weekDates = getWeekDates(weekOffset)
  const startDate = weekDates[0]
  const endDate = weekDates[6]

  useEffect(() => {
    setLoading(true)
    supabase
      .from('sessions')
      .select('*, session_athletes(athlete:athletes(first_name, last_name)), session_drills(id)')
      .gte('session_date', startDate)
      .lte('session_date', endDate)
      .order('start_time', { ascending: true })
      .then(({ data }) => {
        setSessions(data ?? [])
        setLoading(false)
      })
  }, [startDate, endDate])

  const today = new Date().toISOString().split('T')[0]

  const weekLabel = (() => {
    const start = new Date(startDate + 'T00:00:00')
    const end = new Date(endDate + 'T00:00:00')
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `${startStr} – ${endStr}`
  })()

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Schedule</h1>
          <Link to="/" className="text-xs text-blue-500">← Today</Link>
        </div>
        <Link
          to="/sessions/new"
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + Session
        </Link>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 px-4 py-3 mb-4">
        <button
          onClick={() => setWeekOffset(o => o - 1)}
          className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-lg px-1"
        >
          ‹
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{weekLabel}</p>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="text-xs text-blue-500 mt-0.5"
            >
              Back to this week
            </button>
          )}
        </div>
        <button
          onClick={() => setWeekOffset(o => o + 1)}
          className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-lg px-1"
        >
          ›
        </button>
      </div>

      {/* Days */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-zinc-400 text-sm">Loading...</div>
      ) : (
        <div className="space-y-3">
          {weekDates.map((date, i) => {
            const daySessions = sessions.filter(s => s.session_date === date)
            const isToday = date === today
            const isPast = date < today

            return (
              <div key={date} className={`rounded-2xl border overflow-hidden ${
                isToday
                  ? 'border-blue-400 dark:border-blue-600'
                  : 'border-zinc-200 dark:border-zinc-800'
              }`}>
                {/* Day header */}
                <div className={`px-4 py-2.5 flex items-center justify-between ${
                  isToday
                    ? 'bg-blue-600 dark:bg-blue-700'
                    : isPast
                    ? 'bg-zinc-50 dark:bg-zinc-900'
                    : 'bg-white dark:bg-zinc-900'
                }`}>
                  <p className={`text-sm font-semibold ${
                    isToday ? 'text-white' : isPast ? 'text-zinc-400' : 'text-zinc-700 dark:text-zinc-300'
                  }`}>
                    {DAY_LABELS[i]} · {formatShortDate(date)}
                    {isToday && <span className="ml-2 text-blue-100 text-xs font-normal">Today</span>}
                  </p>
                  <span className={`text-xs ${isToday ? 'text-blue-200' : 'text-zinc-400'}`}>
                    {daySessions.length > 0 ? `${daySessions.length} session${daySessions.length > 1 ? 's' : ''}` : '—'}
                  </span>
                </div>

                {/* Sessions for this day */}
                {daySessions.length > 0 && (
                  <div className="bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
                    {daySessions.map(s => {
                      const athletes = s.session_athletes?.map(sa => sa.athlete).filter(Boolean) ?? []
                      return (
                        <Link key={s.id} to={`/sessions/${s.id}`} className="block px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{s.session_title}</p>
                            <span className="text-xs text-zinc-400 flex-shrink-0">{s.session_drills?.length ?? 0} drills</span>
                          </div>
                          {(s.start_time || s.location) && (
                            <p className="text-xs text-zinc-400 mt-0.5">
                              {[
                                s.start_time && (s.end_time ? `${formatTime(s.start_time)} – ${formatTime(s.end_time)}` : formatTime(s.start_time)),
                                s.location,
                              ].filter(Boolean).join(' · ')}
                            </p>
                          )}
                          {athletes.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {athletes.map((a, j) => (
                                <span key={j} className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-2 py-0.5 rounded-full">
                                  {a.first_name} {a.last_name}
                                </span>
                              ))}
                            </div>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekDates(offset = 0) {
  const today = new Date()
  const day = today.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diffToMonday + offset * 7)
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
}

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
}
