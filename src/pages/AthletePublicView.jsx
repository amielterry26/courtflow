import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const CATEGORY_ORDER = [
  'warmup', 'ball handling', 'shooting', 'finishing',
  'footwork', 'defense', 'IQ', 'strength & conditioning', 'recovery',
]

const CATEGORY_LABELS = {
  'ball handling':          'Ball Handling',
  'shooting':               'Shooting',
  'finishing':              'Finishing',
  'footwork':               'Footwork',
  'defense':                'Defense',
  'strength & conditioning':'Strength & Conditioning',
  'IQ':                     'Basketball IQ',
  'warmup':                 'Warmup',
  'recovery':               'Recovery',
}

export default function AthletePublicView() {
  const { token } = useParams()
  const [athlete, setAthlete] = useState(null)
  const [sessions, setSessions] = useState([])
  const [notFound, setNotFound] = useState(false)
  const [expanded, setExpanded] = useState(new Set())

  useEffect(() => {
    async function load() {
      const { data: a } = await supabase
        .from('athletes')
        .select('*')
        .eq('share_token', token)
        .single()

      if (!a) { setNotFound(true); return }
      setAthlete(a)

      const { data: s } = await supabase
        .from('sessions')
        .select('*, session_athletes!inner(athlete_id), session_drills(*, drill:drills(title, category, description))')
        .eq('session_athletes.athlete_id', a.id)
        .gte('session_date', new Date().toISOString().split('T')[0])
        .order('session_date')
        .limit(10)
      setSessions(s ?? [])
    }
    load()
  }, [token])

  function toggleExpand(id) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center text-zinc-400">
          <div className="text-4xl mb-3">🏀</div>
          <p className="font-medium">Link not found</p>
        </div>
      </div>
    )
  }

  if (!athlete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-400 text-sm">Loading...</p>
      </div>
    )
  }

  const athleteName = `${athlete.first_name} ${athlete.last_name}`

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 px-4 py-8">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xl mx-auto mb-3">
            {athlete.first_name?.[0] ?? '?'}{athlete.last_name?.[0] ?? ''}
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{athleteName}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {[athlete.position, athlete.school, athlete.skill_level].filter(Boolean).join(' · ')}
          </p>
        </div>

        {/* Goals */}
        {athlete.goals && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 mb-4">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Goals</h2>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">{athlete.goals}</p>
          </div>
        )}

        {/* Session Pack */}
        {athlete.sessions_purchased > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 mb-4">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Session Pack</h2>
            <div className="flex items-end justify-between mb-1.5">
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {athlete.sessions_used ?? 0} <span className="text-base font-normal text-zinc-400">of {athlete.sessions_purchased}</span>
              </p>
              <p className="text-sm text-zinc-400">{Math.max(athlete.sessions_purchased - (athlete.sessions_used ?? 0), 0)} remaining</p>
            </div>
            <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${Math.min(Math.round(((athlete.sessions_used ?? 0) / athlete.sessions_purchased) * 100), 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Upcoming sessions */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide px-1">Upcoming Sessions</h2>

          {sessions.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 text-center">
              <p className="text-sm text-zinc-400">No upcoming sessions scheduled</p>
            </div>
          ) : (
            sessions.map(s => {
              const isOpen = expanded.has(s.id)
              const drills = [...(s.session_drills ?? [])].sort((a, b) => a.order_index - b.order_index)
              const grouped = groupByCategory(drills)
              const dateLabel = formatDate(s.session_date)
              const timeLabel = s.start_time
                ? s.end_time
                  ? `${formatTime(s.start_time)} – ${formatTime(s.end_time)}`
                  : formatTime(s.start_time)
                : null

              return (
                <div key={s.id} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  {/* Session header — tap to expand */}
                  <button
                    onClick={() => toggleExpand(s.id)}
                    className="w-full text-left px-4 py-4 flex items-start justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{s.session_title}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">{dateLabel}</span>
                        {timeLabel && <span className="text-xs text-zinc-400">· {timeLabel}</span>}
                        {s.location && <span className="text-xs text-zinc-400">· {s.location}</span>}
                      </div>
                    </div>
                    <span className="text-zinc-400 text-sm mt-0.5 flex-shrink-0">{isOpen ? '▲' : '▼'}</span>
                  </button>

                  {/* Expanded content */}
                  {isOpen && (
                    <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 pt-4 pb-5 space-y-4">

                      {/* Drills grouped by category */}
                      {grouped.length === 0 ? (
                        <p className="text-sm text-zinc-400">No drills added yet</p>
                      ) : (
                        grouped.map(({ category, drills: catDrills }) => (
                          <div key={category}>
                            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                              {CATEGORY_LABELS[category] ?? category}
                            </p>
                            <div className="space-y-2">
                              {catDrills.map(sd => (
                                <div key={sd.id} className="flex gap-2">
                                  <span className="text-blue-400 mt-0.5 flex-shrink-0">•</span>
                                  <div>
                                    <span className="text-sm text-zinc-800 dark:text-zinc-200 font-medium">
                                      {sd.drill?.title}
                                    </span>
                                    <span className="text-xs text-zinc-400 ml-2">
                                      {[
                                        sd.duration_minutes && `${sd.duration_minutes} min`,
                                        sd.target_reps && `${sd.target_reps} reps`,
                                        sd.target_makes && `${sd.target_makes} makes`,
                                      ].filter(Boolean).join(' · ')}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}

                      {/* Add to Calendar */}
                      {s.start_time && (
                        <div className="pt-2 flex gap-2">
                          <button
                            onClick={() => openAppleCalendar(s, athleteName)}
                            className="flex-1 text-xs py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                          >
                            📅 Apple Calendar
                          </button>
                          <a
                            href={googleCalendarURL(s, athleteName)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 text-xs py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-center"
                          >
                            📅 Google Calendar
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Bulk calendar export */}
        {sessions.filter(s => s.start_time).length > 1 && (
          <button
            onClick={() => openAllAppleCalendar(sessions, athleteName)}
            className="w-full mt-2 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-500 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-900 transition-colors"
          >
            📅 Add all to Apple Calendar
          </button>
        )}

        <p className="text-center text-xs text-zinc-300 dark:text-zinc-700 mt-8">
          Powered by CourtFlow
        </p>
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function groupByCategory(drills) {
  const map = {}
  for (const sd of drills) {
    const cat = sd.drill?.category ?? 'other'
    if (!map[cat]) map[cat] = []
    map[cat].push(sd)
  }
  const result = []
  for (const cat of CATEGORY_ORDER) {
    if (map[cat]) result.push({ category: cat, drills: map[cat] })
  }
  // catch any category not in CATEGORY_ORDER
  for (const cat of Object.keys(map)) {
    if (!CATEGORY_ORDER.includes(cat)) result.push({ category: cat, drills: map[cat] })
  }
  return result
}

function formatTime(t) {
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function toICSDate(dateStr, timeStr) {
  const date = dateStr.replace(/-/g, '')
  if (!timeStr) return date
  const time = timeStr.replace(/:/g, '').slice(0, 6)
  return `${date}T${time}`
}

function openAppleCalendar(session, athleteName) {
  const start = toICSDate(session.session_date, session.start_time)
  const end = toICSDate(session.session_date, session.end_time || session.start_time)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CourtFlow//EN',
    'BEGIN:VEVENT',
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${athleteName} — ${session.session_title}`,
    session.location ? `LOCATION:${session.location}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  if (isIOS) {
    window.location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(lines)
    return
  }

  const blob = new Blob([lines], { type: 'text/calendar' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function openAllAppleCalendar(sessions, athleteName) {
  const events = sessions
    .filter(s => s.start_time)
    .map(s => {
      const start = toICSDate(s.session_date, s.start_time)
      const end = toICSDate(s.session_date, s.end_time || s.start_time)
      return [
        'BEGIN:VEVENT',
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:${athleteName} — ${s.session_title}`,
        s.location ? `LOCATION:${s.location}` : null,
        'END:VEVENT',
      ].filter(Boolean).join('\r\n')
    })

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CourtFlow//EN',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  if (isIOS) {
    window.location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics)
    return
  }

  const blob = new Blob([ics], { type: 'text/calendar' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function googleCalendarURL(session, athleteName) {
  const start = toICSDate(session.session_date, session.start_time)
  const end = toICSDate(session.session_date, session.end_time || session.start_time)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${athleteName} — ${session.session_title}`,
    dates: `${start}/${end}`,
    ...(session.location && { location: session.location }),
  })
  return `https://calendar.google.com/calendar/render?${params}`
}
