import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const BLANK = {
  session_title: '',
  session_date: new Date().toISOString().split('T')[0],
  start_time: '',
  end_time: '',
  location: '',
  notes: '',
}

export default function SessionForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [form, setForm] = useState(BLANK)
  const [athletes, setAthletes] = useState([])
  const [selectedAthletes, setSelectedAthletes] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('athletes').select('id, first_name, last_name').eq('status', 'active').order('last_name')
      .then(({ data }) => setAthletes(data ?? []))

    if (isEdit) {
      supabase.from('sessions').select('*, session_athletes(athlete_id)').eq('id', id).single()
        .then(({ data }) => {
          if (data) {
            const { session_athletes, ...rest } = data
            setForm(rest)
            setSelectedAthletes(session_athletes?.map(sa => sa.athlete_id) ?? [])
          }
        })
    }
  }, [id, isEdit])

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  function toggleAthlete(athleteId) {
    setSelectedAthletes(prev =>
      prev.includes(athleteId) ? prev.filter(id => id !== athleteId) : [...prev, athleteId]
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    let sessionId = id

    if (isEdit) {
      const { error } = await supabase.from('sessions').update(form).eq('id', id)
      if (error) { setError(error.message); setSaving(false); return }
      await supabase.from('session_athletes').delete().eq('session_id', id)
    } else {
      const { data, error } = await supabase.from('sessions').insert(form).select().single()
      if (error) { setError(error.message); setSaving(false); return }
      sessionId = data.id
    }

    if (selectedAthletes.length > 0) {
      await supabase.from('session_athletes').insert(
        selectedAthletes.map(athlete_id => ({ session_id: sessionId, athlete_id }))
      )
    }

    navigate(`/sessions/${sessionId}`)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">← Back</button>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{isEdit ? 'Edit Session' : 'New Session'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
          <Field label="Session title *" value={form.session_title} onChange={set('session_title')} required />
          <Field label="Date *" value={form.session_date} onChange={set('session_date')} type="date" required />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start time" value={form.start_time} onChange={set('start_time')} type="time" />
            <Field label="End time" value={form.end_time} onChange={set('end_time')} type="time" />
          </div>
          <Field label="Location" value={form.location} onChange={set('location')} placeholder="e.g. Lifetime Fitness, Home..." />
          <TextArea label="Notes" value={form.notes} onChange={set('notes')} />
        </div>

        {/* Athlete picker */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">Athletes</h2>
          {athletes.length === 0 ? (
            <p className="text-sm text-zinc-400">No athletes yet</p>
          ) : (
            <div className="space-y-2">
              {athletes.map(a => (
                <label key={a.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedAthletes.includes(a.id)}
                    onChange={() => toggleAthlete(a.id)}
                    className="w-4 h-4 rounded accent-blue-600"
                  />
                  <span className="text-sm text-zinc-800 dark:text-zinc-200">{a.first_name} {a.last_name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="pb-6">
          <button type="submit" disabled={saving}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create session'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, required, type = 'text', value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{label}</label>
      <input type={type} required={required} value={value ?? ''} onChange={onChange} placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  )
}

function TextArea({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{label}</label>
      <textarea value={value ?? ''} onChange={onChange} rows={3}
        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
    </div>
  )
}
