import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { supabase } from '../lib/supabase'

const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

export default function SessionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [athletes, setAthletes] = useState([])
  const [sessionDrills, setSessionDrills] = useState([])
  const [allDrills, setAllDrills] = useState([])
  const [showDrillPicker, setShowDrillPicker] = useState(false)
  const [drillSearch, setDrillSearch] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('sessions')
      .select('*, session_athletes(athlete_id, athlete:athletes(first_name, last_name))')
      .eq('id', id)
      .single()
    setSession(data)
    setAthletes(data?.session_athletes?.map(sa => sa.athlete).filter(Boolean) ?? [])

    const { data: sds } = await supabase
      .from('session_drills')
      .select('*, drill:drills(*)')
      .eq('session_id', id)
      .order('order_index')
    setSessionDrills(sds ?? [])
  }, [id])

  useEffect(() => {
    load()
    supabase.from('drills').select('*').order('title').then(({ data }) => setAllDrills(data ?? []))
  }, [load])

  async function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = sessionDrills.findIndex(d => d.id === active.id)
    const newIndex = sessionDrills.findIndex(d => d.id === over.id)
    const reordered = arrayMove(sessionDrills, oldIndex, newIndex)
    setSessionDrills(reordered)

    // Persist new order
    await Promise.all(
      reordered.map((sd, i) =>
        supabase.from('session_drills').update({ order_index: i }).eq('id', sd.id)
      )
    )
  }

  async function addDrill(drill) {
    const { data } = await supabase
      .from('session_drills')
      .insert({
        session_id: id,
        drill_id: drill.id,
        order_index: sessionDrills.length,
      })
      .select('*, drill:drills(*)')
      .single()
    if (data) setSessionDrills(prev => [...prev, data])
    setShowDrillPicker(false)
    setDrillSearch('')
  }

  async function removeDrill(sdId) {
    await supabase.from('session_drills').delete().eq('id', sdId)
    setSessionDrills(prev => prev.filter(sd => sd.id !== sdId))
  }

  async function updateDrillField(sdId, field, value) {
    setSessionDrills(prev => prev.map(sd => sd.id === sdId ? { ...sd, [field]: value } : sd))
    await supabase.from('session_drills').update({ [field]: value }).eq('id', sdId)
  }

  async function deleteSession() {
    if (!confirm('Delete this session?')) return
    await supabase.from('sessions').delete().eq('id', id)
    navigate('/sessions')
  }

  async function duplicateSession() {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const newDate = tomorrow.toISOString().split('T')[0]

    const { data: newSession, error } = await supabase
      .from('sessions')
      .insert({
        session_title: session.session_title,
        session_date: newDate,
        start_time: session.start_time,
        end_time: session.end_time,
        location: session.location,
        notes: session.notes,
      })
      .select()
      .single()
    if (error || !newSession) return

    // Copy athletes
    if (athletes.length > 0) {
      const athleteIds = session.session_athletes?.map(sa => sa.athlete?.id ?? sa.athlete_id).filter(Boolean) ?? []
      if (athleteIds.length > 0) {
        await supabase.from('session_athletes').insert(
          athleteIds.map(athlete_id => ({ session_id: newSession.id, athlete_id }))
        )
      }
    }

    // Copy drills
    if (sessionDrills.length > 0) {
      await supabase.from('session_drills').insert(
        sessionDrills.map(sd => ({
          session_id: newSession.id,
          drill_id: sd.drill_id,
          order_index: sd.order_index,
          custom_notes: sd.custom_notes,
          target_reps: sd.target_reps,
          target_makes: sd.target_makes,
          duration_minutes: sd.duration_minutes,
        }))
      )
    }

    navigate(`/sessions/${newSession.id}`)
  }

  if (!session) return <PageLoading />

  const availableDrills = allDrills.filter(d =>
    !sessionDrills.find(sd => sd.drill_id === d.id) &&
    d.title.toLowerCase().includes(drillSearch.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Link to="/sessions" className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">← Back</Link>
        </div>
        <div className="flex gap-2">
          <button onClick={duplicateSession}
            className="text-sm px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
            Duplicate
          </button>
          <Link to={`/sessions/${id}/edit`}
            className="text-sm px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
            Edit
          </Link>
          <button onClick={deleteSession}
            className="text-sm px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
            Delete
          </button>
        </div>
      </div>

      {/* Session header */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 mb-4">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">{session.session_title}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {formatDate(session.session_date)}
          {session.start_time && ` · ${formatTime(session.start_time)}`}
          {session.end_time && ` – ${formatTime(session.end_time)}`}
        </p>

        {athletes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {athletes.map((a, i) => (
              <span key={i} className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                {a.first_name} {a.last_name}
              </span>
            ))}
          </div>
        )}

        {session.notes && (
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800 pt-3">
            {session.notes}
          </p>
        )}

        {session.start_time && (
          <div className="flex gap-2 mt-3 border-t border-zinc-100 dark:border-zinc-800 pt-3">
            {IS_IOS && (
              <button
                onClick={() => openAppleCalendar(session)}
                className="flex-1 text-xs py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                📅 Apple Calendar
              </button>
            )}
            <a
              href={googleCalendarURL(session)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-xs py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-center"
            >
              📅 Google Calendar
            </a>
          </div>
        )}
      </div>

      {/* Drill builder */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Drills ({sessionDrills.length})
          </h2>
          <button
            onClick={() => setShowDrillPicker(true)}
            className="text-sm text-blue-600 dark:text-blue-400 font-medium"
          >
            + Add drill
          </button>
        </div>

        {sessionDrills.length === 0 ? (
          <p className="text-sm text-zinc-400 py-4 text-center">No drills yet. Add some to build this session.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sessionDrills.map(d => d.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {sessionDrills.map((sd, i) => (
                  <SortableDrillItem
                    key={sd.id}
                    sd={sd}
                    index={i}
                    onRemove={removeDrill}
                    onUpdate={updateDrillField}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Drill picker modal */}
      {showDrillPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setShowDrillPicker(false)}>
          <div
            className="bg-white dark:bg-zinc-900 rounded-t-2xl w-full max-h-[70vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Add Drill</h3>
                <button onClick={() => setShowDrillPicker(false)} className="text-zinc-400">✕</button>
              </div>
              <input
                type="search"
                placeholder="Search drills..."
                value={drillSearch}
                onChange={e => setDrillSearch(e.target.value)}
                autoFocus
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {availableDrills.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-8">
                  {drillSearch ? 'No matching drills' : 'All drills already added'}
                </p>
              ) : (
                availableDrills.map(d => (
                  <button
                    key={d.id}
                    onClick={() => addDrill(d)}
                    className="w-full text-left px-3 py-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{d.title}</p>
                    <p className="text-xs text-zinc-400 capitalize">{d.category} · {d.difficulty}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SortableDrillItem({ sd, index, onRemove, onUpdate }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sd.id })
  const [expanded, setExpanded] = useState(false)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800">
        <button {...attributes} {...listeners} className="text-zinc-300 dark:text-zinc-600 cursor-grab active:cursor-grabbing touch-none">
          ⠿
        </button>
        <span className="text-xs text-zinc-400 w-4">{index + 1}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{sd.drill?.title}</p>
          {sd.drill?.category && (
            <p className="text-xs text-zinc-400 capitalize">{sd.drill.category}</p>
          )}
        </div>
        <button onClick={() => setExpanded(e => !e)} className="text-xs text-zinc-400 px-2">
          {expanded ? '▲' : '▼'}
        </button>
        <button onClick={() => onRemove(sd.id)} className="text-xs text-red-400 px-2">✕</button>
      </div>

      {expanded && (
        <div className="px-3 py-3 space-y-2 bg-white dark:bg-zinc-900">
          <div className="grid grid-cols-3 gap-2">
            <SmallField label="Duration (min)" value={sd.duration_minutes ?? ''} type="number"
              onChange={v => onUpdate(sd.id, 'duration_minutes', v ? parseInt(v) : null)} />
            <SmallField label="Target reps" value={sd.target_reps ?? ''} type="number"
              onChange={v => onUpdate(sd.id, 'target_reps', v ? parseInt(v) : null)} />
            <SmallField label="Target makes" value={sd.target_makes ?? ''} type="number"
              onChange={v => onUpdate(sd.id, 'target_makes', v ? parseInt(v) : null)} />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Notes</label>
            <input
              type="text"
              value={sd.custom_notes ?? ''}
              onChange={e => onUpdate(sd.id, 'custom_notes', e.target.value)}
              placeholder="Coaching notes..."
              className="w-full px-2 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function SmallField({ label, value, type, onChange }) {
  return (
    <div>
      <label className="block text-xs text-zinc-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-2 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none"
      />
    </div>
  )
}

function formatDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function formatTime(t) {
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
}

function toICSDate(dateStr, timeStr) {
  const date = dateStr.replace(/-/g, '')
  if (!timeStr) return date
  const time = timeStr.replace(/:/g, '').slice(0, 6)
  return `${date}T${time}`
}

function openAppleCalendar(session) {
  const start = toICSDate(session.session_date, session.start_time)
  const end = toICSDate(session.session_date, session.end_time || session.start_time)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CourtFlow//EN',
    'BEGIN:VEVENT',
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${session.session_title}`,
    session.location ? `LOCATION:${session.location}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  if (isIOS) {
    // On iOS, navigating to a data:text/calendar URI triggers Calendar app
    window.location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(lines)
    return
  }

  // Desktop: open blob without download attr so OS opens with Calendar.app
  const blob = new Blob([lines], { type: 'text/calendar' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function googleCalendarURL(session) {
  const start = toICSDate(session.session_date, session.start_time)
  const end = toICSDate(session.session_date, session.end_time || session.start_time)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: session.session_title,
    dates: `${start}/${end}`,
    ...(session.location && { location: session.location }),
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

function PageLoading() {
  return <div className="flex items-center justify-center py-20 text-zinc-400 text-sm">Loading...</div>
}
