import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function usePlayerRules(athleteId) {
  const [rules, setRules] = useState([])

  useEffect(() => {
    supabase.from('player_rules').select('*').eq('athlete_id', athleteId).order('order_index')
      .then(({ data }) => setRules(data ?? []))
  }, [athleteId])

  async function addRule(text) {
    const { data } = await supabase.from('player_rules')
      .insert({ athlete_id: athleteId, rule: text, order_index: rules.length })
      .select().single()
    if (data) setRules(prev => [...prev, data])
  }

  async function updateRule(id, text) {
    await supabase.from('player_rules').update({ rule: text }).eq('id', id)
    setRules(prev => prev.map(r => r.id === id ? { ...r, rule: text } : r))
  }

  async function deleteRule(id) {
    await supabase.from('player_rules').delete().eq('id', id)
    setRules(prev => prev.filter(r => r.id !== id))
  }

  async function moveRule(id, direction) {
    const idx = rules.findIndex(r => r.id === id)
    const swapIdx = idx + direction
    if (swapIdx < 0 || swapIdx >= rules.length) return
    const reordered = [...rules]
    ;[reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]]
    setRules(reordered)
    await Promise.all([
      supabase.from('player_rules').update({ order_index: swapIdx }).eq('id', reordered[swapIdx].id),
      supabase.from('player_rules').update({ order_index: idx }).eq('id', reordered[idx].id),
    ])
  }

  return { rules, addRule, updateRule, deleteRule, moveRule }
}

const SKILL_COLORS = {
  beginner: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400',
  intermediate: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
  advanced: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400',
}

export default function AthleteDetail() {
  const { id } = useParams()
  const [athlete, setAthlete] = useState(null)
  const { rules, addRule, updateRule, deleteRule, moveRule } = usePlayerRules(id)
  const [todaySessions, setTodaySessions] = useState([])
  const [upcomingSessions, setUpcomingSessions] = useState([])
  const [pastSessions, setPastSessions] = useState([])
  const [totalSessions, setTotalSessions] = useState(0)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    supabase.from('athletes').select('*').eq('id', id).single().then(({ data }) => setAthlete(data))

    // Today's sessions
    supabase
      .from('sessions')
      .select('*, session_athletes!inner(athlete_id), session_drills(*, drill:drills(title))')
      .eq('session_athletes.athlete_id', id)
      .eq('session_date', today)
      .order('start_time')
      .then(({ data }) => setTodaySessions(data ?? []))

    // Upcoming (future only)
    supabase
      .from('sessions')
      .select('*, session_athletes!inner(athlete_id), session_drills(id)')
      .eq('session_athletes.athlete_id', id)
      .gte('session_date', tomorrowStr)
      .order('session_date')
      .limit(5)
      .then(({ data }) => setUpcomingSessions(data ?? []))

    // Past
    supabase
      .from('sessions')
      .select('*, session_athletes!inner(athlete_id), session_drills(id)')
      .eq('session_athletes.athlete_id', id)
      .lt('session_date', today)
      .order('session_date', { ascending: false })
      .limit(20)
      .then(({ data }) => setPastSessions(data ?? []))

    // Total count
    supabase
      .from('sessions')
      .select('id, session_athletes!inner(athlete_id)', { count: 'exact' })
      .eq('session_athletes.athlete_id', id)
      .then(({ count }) => setTotalSessions(count ?? 0))
  }, [id])

  function copyShareLink() {
    const url = `${window.location.origin}/athlete/${athlete.share_token}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (!athlete) return <div className="flex items-center justify-center py-20 text-zinc-400 text-sm">Loading...</div>

  const hasDevelopment = athlete.goals || athlete.strengths || athlete.weaknesses || athlete.notes

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <Link to="/athletes" className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">← Back</Link>
      </div>

      {/* ── Header card ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4">

        {/* Name row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg flex-shrink-0">
              {athlete.first_name?.[0] ?? '?'}{athlete.last_name?.[0] ?? ''}
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {athlete.first_name} {athlete.last_name}
              </h1>
              {/* Quick stats row: grade · age · gender · sessions */}
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                {[
                  athlete.grade ? `Grade ${athlete.grade}` : null,
                  athlete.age ? `${athlete.age}y` : null,
                  athlete.gender,
                  totalSessions > 0 ? `${totalSessions} sessions` : null,
                ].filter(Boolean).join(' · ')}
              </p>
              {(athlete.position || athlete.school) && (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                  {[athlete.position, athlete.school].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>
          <Link to={`/athletes/${id}/edit`} className="text-sm text-blue-600 dark:text-blue-400 font-medium flex-shrink-0">Edit</Link>
        </div>

        {/* Skill badge */}
        {athlete.skill_level && (
          <div className="mb-4">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${SKILL_COLORS[athlete.skill_level]}`}>
              {athlete.skill_level}
            </span>
          </div>
        )}

        {/* Parent contact — always visible, tappable */}
        {(athlete.parent_name || athlete.parent_phone || athlete.parent_email) && (
          <div className="border border-zinc-100 dark:border-zinc-800 rounded-xl p-3 mb-3 space-y-2">
            {athlete.parent_name && (
              <div className="flex items-center gap-3">
                <span className="text-zinc-400 text-xs w-12 flex-shrink-0">Parent</span>
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{athlete.parent_name}</span>
              </div>
            )}
            {athlete.parent_phone && (
              <div className="flex items-center gap-3">
                <span className="text-zinc-400 text-xs w-12 flex-shrink-0">Phone</span>
                <a href={`tel:${athlete.parent_phone}`} className="text-sm text-blue-600 dark:text-blue-400 font-medium">{athlete.parent_phone}</a>
              </div>
            )}
            {athlete.parent_email && (
              <div className="flex items-center gap-3">
                <span className="text-zinc-400 text-xs w-12 flex-shrink-0">Email</span>
                <a href={`mailto:${athlete.parent_email}`} className="text-sm text-blue-600 dark:text-blue-400 truncate">{athlete.parent_email}</a>
              </div>
            )}
          </div>
        )}

        <button
          onClick={copyShareLink}
          className="w-full text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg py-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          {copied ? '✓ Link copied!' : '🔗 Copy parent share link'}
        </button>
      </div>

      {/* ── Info ── */}
      <Collapsible title="Info" defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <InfoItem label="Age" value={athlete.age} />
          <InfoItem label="Grade" value={athlete.grade} />
          <InfoItem label="Gender" value={athlete.gender} />
          <InfoItem label="Team" value={athlete.team} />
          <InfoItem label="Fav player" value={athlete.favorite_player} />
        </div>
      </Collapsible>

      {/* ── Session Pack ── */}
      {athlete.sessions_purchased > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 mb-4">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">Session Pack</h2>
          <SessionPackBar used={athlete.sessions_used ?? 0} purchased={athlete.sessions_purchased} />
        </div>
      )}

      {/* ── Development ── */}
      {hasDevelopment && (
        <Collapsible title="Development" defaultOpen>
          <div className="space-y-3">
            <InfoItem label="Goals" value={athlete.goals} />
            <InfoItem label="Strengths" value={athlete.strengths} />
            <InfoItem label="Weaknesses" value={athlete.weaknesses} />
            <InfoItem label="Notes" value={athlete.notes} />
          </div>
        </Collapsible>
      )}

      {/* ── Player Rules ── */}
      <Collapsible title="Player Rules" defaultOpen>
        <PlayerRules rules={rules} onAdd={addRule} onUpdate={updateRule} onDelete={deleteRule} onMove={moveRule} />
      </Collapsible>

      {/* ── Sessions ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 mb-4 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Sessions</h2>
        </div>
        <div className="p-4 space-y-4">

          {/* Today */}
          {todaySessions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-2">Today</p>
              <div className="space-y-2">
                {todaySessions.map(s => <SessionRow key={s.id} s={s} />)}
              </div>
            </div>
          )}

          {/* Upcoming */}
          {upcomingSessions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-2">Upcoming</p>
              <div className="space-y-2">
                {upcomingSessions.map(s => <SessionRow key={s.id} s={s} />)}
              </div>
            </div>
          )}

          {/* No sessions yet */}
          {todaySessions.length === 0 && upcomingSessions.length === 0 && pastSessions.length === 0 && (
            <p className="text-sm text-zinc-400">No sessions yet</p>
          )}

          {/* Past sessions — collapsed accordion */}
          {pastSessions.length > 0 && (
            <PastSessionsAccordion sessions={pastSessions} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Past sessions accordion ──────────────────────────────────────────────────

function PastSessionsAccordion({ sessions }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide"
      >
        <span>Past ({sessions.length})</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {sessions.map(s => <SessionRow key={s.id} s={s} dim />)}
        </div>
      )}
    </div>
  )
}

function SessionRow({ s, dim }) {
  return (
    <Link to={`/sessions/${s.id}`} className="block">
      <div className={`flex items-center justify-between rounded-xl border border-zinc-100 dark:border-zinc-800 px-3 py-2.5 hover:border-blue-200 dark:hover:border-blue-800 transition-colors ${dim ? 'opacity-60' : ''}`}>
        <div>
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{s.session_title}</p>
          <p className="text-xs text-zinc-400">{formatDate(s.session_date)}</p>
        </div>
        <span className="text-xs text-zinc-400">{s.session_drills?.length ?? 0} drills →</span>
      </div>
    </Link>
  )
}

// ─── Collapsible ─────────────────────────────────────────────────────────────

function Collapsible({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 mb-4 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{title}</h2>
        <span className="text-zinc-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

// ─── Player Rules ─────────────────────────────────────────────────────────────

function PlayerRules({ rules, onAdd, onUpdate, onDelete, onMove }) {
  const [newRule, setNewRule] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')

  async function handleAdd() {
    const text = newRule.trim()
    if (!text) return
    await onAdd(text)
    setNewRule('')
  }

  function startEdit(rule) {
    setEditingId(rule.id)
    setEditText(rule.rule)
  }

  async function saveEdit(id) {
    const text = editText.trim()
    if (text) await onUpdate(id, text)
    setEditingId(null)
  }

  return (
    <div>
      {rules.length > 0 && (
        <div className="space-y-2 mb-3">
          {rules.map((r, i) => (
            <div key={r.id} className="flex items-start gap-2 group">
              <div className="flex flex-col gap-0.5 pt-0.5 flex-shrink-0">
                <button onClick={() => onMove(r.id, -1)} disabled={i === 0}
                  className="text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 disabled:opacity-20 text-xs leading-none">▲</button>
                <button onClick={() => onMove(r.id, 1)} disabled={i === rules.length - 1}
                  className="text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 disabled:opacity-20 text-xs leading-none">▼</button>
              </div>
              <span className="text-zinc-400 text-sm mt-0.5 flex-shrink-0">{i + 1}.</span>
              {editingId === r.id ? (
                <div className="flex-1 flex gap-2">
                  <input value={editText} onChange={e => setEditText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(r.id); if (e.key === 'Escape') setEditingId(null) }}
                    autoFocus className="flex-1 text-sm px-2 py-1 rounded-lg border border-blue-400 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none" />
                  <button onClick={() => saveEdit(r.id)} className="text-xs text-blue-500 font-medium">Save</button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-zinc-400">Cancel</button>
                </div>
              ) : (
                <div className="flex-1 flex items-start justify-between gap-2">
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">{r.rule}</p>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={() => startEdit(r)} className="text-xs text-blue-500">Edit</button>
                    <button onClick={() => onDelete(r.id)} className="text-xs text-red-400">✕</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input value={newRule} onChange={e => setNewRule(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
          placeholder="Add a rule..."
          className="flex-1 text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button onClick={handleAdd}
          className="text-sm px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
          Add
        </button>
      </div>
    </div>
  )
}

// ─── Helpers / Sub-components ─────────────────────────────────────────────────

function SessionPackBar({ used, purchased }) {
  const pct = Math.min(Math.round((used / purchased) * 100), 100)
  const remaining = Math.max(purchased - used, 0)
  return (
    <div>
      <div className="flex items-end justify-between mb-1.5">
        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {used} <span className="text-base font-normal text-zinc-400">of {purchased}</span>
        </p>
        <p className="text-sm text-zinc-400">{remaining} remaining</p>
      </div>
      <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function InfoItem({ label, value }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-zinc-400 dark:text-zinc-500">{label}</p>
      <p className="text-sm text-zinc-800 dark:text-zinc-200">{value}</p>
    </div>
  )
}
