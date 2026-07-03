import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AthletePublicView() {
  const { token } = useParams()
  const [athlete, setAthlete] = useState(null)
  const [sessions, setSessions] = useState([])
  const [notFound, setNotFound] = useState(false)

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

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 px-4 py-8">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xl mx-auto mb-3">
            {athlete.first_name[0]}{athlete.last_name[0]}
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {athlete.first_name} {athlete.last_name}
          </h1>
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

        {/* Upcoming sessions */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Upcoming Sessions</h2>
          {sessions.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-4">No upcoming sessions scheduled</p>
          ) : (
            <div className="space-y-4">
              {sessions.map(s => {
                const drills = [...(s.session_drills ?? [])].sort((a, b) => a.order_index - b.order_index)
                return (
                  <div key={s.id} className="border-b border-zinc-100 dark:border-zinc-800 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-zinc-800 dark:text-zinc-200">{s.session_title}</p>
                      <p className="text-xs text-zinc-400">
                        {new Date(s.session_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    {s.start_time && (
                      <p className="text-xs text-zinc-400 mb-2">{formatTime(s.start_time)}</p>
                    )}
                    {drills.length > 0 && (
                      <ol className="space-y-1.5">
                        {drills.map((sd, i) => (
                          <li key={sd.id} className="flex gap-2 text-sm">
                            <span className="text-zinc-300 dark:text-zinc-600 w-4 flex-shrink-0">{i + 1}.</span>
                            <div>
                              <span className="text-zinc-700 dark:text-zinc-300">{sd.drill?.title}</span>
                              {sd.duration_minutes && (
                                <span className="text-xs text-zinc-400 ml-2">{sd.duration_minutes} min</span>
                              )}
                              {sd.custom_notes && (
                                <p className="text-xs text-zinc-400 mt-0.5">{sd.custom_notes}</p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                    {s.notes && <p className="text-xs text-zinc-400 mt-2 italic">{s.notes}</p>}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-zinc-300 dark:text-zinc-700 mt-6">
          Powered by CourtFlow
        </p>
      </div>
    </div>
  )
}

function formatTime(t) {
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
}
