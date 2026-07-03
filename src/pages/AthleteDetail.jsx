import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const SKILL_COLORS = {
  beginner: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400',
  intermediate: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
  advanced: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400',
}

export default function AthleteDetail() {
  const { id } = useParams()
  const [athlete, setAthlete] = useState(null)
  const [sessions, setSessions] = useState([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    supabase.from('athletes').select('*').eq('id', id).single().then(({ data }) => setAthlete(data))

    supabase
      .from('sessions')
      .select('*, session_athletes!inner(athlete_id), session_drills(*, drill:drills(title))')
      .eq('session_athletes.athlete_id', id)
      .gte('session_date', new Date().toISOString().split('T')[0])
      .order('session_date')
      .limit(5)
      .then(({ data }) => setSessions(data ?? []))
  }, [id])

  function copyShareLink() {
    const url = `${window.location.origin}/athlete/${athlete.share_token}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (!athlete) return <div className="flex items-center justify-center py-20 text-zinc-400 text-sm">Loading...</div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/athletes" className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">← Back</Link>
      </div>

      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg">
              {athlete.first_name[0]}{athlete.last_name[0]}
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {athlete.first_name} {athlete.last_name}
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {[athlete.position, athlete.school].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          <Link to={`/athletes/${id}/edit`} className="text-sm text-blue-600 dark:text-blue-400 font-medium">Edit</Link>
        </div>

        {athlete.skill_level && (
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${SKILL_COLORS[athlete.skill_level]}`}>
            {athlete.skill_level}
          </span>
        )}

        <button
          onClick={copyShareLink}
          className="mt-3 w-full text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg py-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          {copied ? '✓ Link copied!' : '🔗 Copy parent share link'}
        </button>
      </div>

      {/* Info grid */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 mb-4 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Info</h2>
        <Grid>
          <InfoItem label="Age" value={athlete.age} />
          <InfoItem label="Grade" value={athlete.grade} />
          <InfoItem label="Team" value={athlete.team} />
          <InfoItem label="Fav player" value={athlete.favorite_player} />
          <InfoItem label="Parent" value={athlete.parent_name} />
          <InfoItem label="Phone" value={athlete.parent_phone} />
          <InfoItem label="Email" value={athlete.parent_email} span />
        </Grid>
      </div>

      {/* Development */}
      {(athlete.goals || athlete.strengths || athlete.weaknesses || athlete.notes) && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 mb-4 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Development</h2>
          <InfoItem label="Goals" value={athlete.goals} />
          <InfoItem label="Strengths" value={athlete.strengths} />
          <InfoItem label="Weaknesses" value={athlete.weaknesses} />
          <InfoItem label="Notes" value={athlete.notes} />
        </div>
      )}

      {/* Upcoming sessions */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">Upcoming Sessions</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-zinc-400">No upcoming sessions</p>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => (
              <Link key={s.id} to={`/sessions/${s.id}`} className="block">
                <div className="flex items-center justify-between rounded-lg border border-zinc-100 dark:border-zinc-800 px-3 py-2 hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{s.session_title}</p>
                    <p className="text-xs text-zinc-400">{s.session_date}</p>
                  </div>
                  <span className="text-xs text-zinc-400">{s.session_drills?.length ?? 0} drills →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Grid({ children }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>
}

function InfoItem({ label, value, span }) {
  if (!value) return null
  return (
    <div className={span ? 'col-span-2' : ''}>
      <p className="text-xs text-zinc-400 dark:text-zinc-500">{label}</p>
      <p className="text-sm text-zinc-800 dark:text-zinc-200">{value}</p>
    </div>
  )
}
