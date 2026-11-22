import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { loadSettings } from '../../lib/pay'
import { fromKey, toKey } from '../../lib/dates'

const BLANK = { run_date: '', start_time: '09:00', end_time: '11:00', gym_id: '', price: '12', capacity: '', notes: '', repeat: '0', count: '6' }

export default function RunForm({ run, onDone }) {
  const [form, setForm] = useState(run ? {
    run_date: run.run_date,
    start_time: run.start_time?.slice(0, 5) ?? '',
    end_time: run.end_time?.slice(0, 5) ?? '',
    gym_id: run.gym_id ?? '',
    price: String(run.price),
    capacity: run.capacity ? String(run.capacity) : '',
    notes: run.notes ?? '',
  } : BLANK)
  const [gyms, setGyms] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('gyms').select('id, name').order('name').then(({ data }) => setGyms(data ?? []))
    if (!run) loadSettings().then(s => s.default_price && setForm(f => ({ ...f, price: String(Number(s.default_price)) })))
  }, [run])

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      run_date: form.run_date,
      start_time: form.start_time,
      end_time: form.end_time || null,
      gym_id: form.gym_id || null,
      price: Number(form.price) || 0,
      capacity: form.capacity ? Number(form.capacity) : null,
      notes: form.notes || null,
    }
    // New runs can repeat weekly / every other week
    const every = Number(form.repeat)
    const rows = run || !every ? [payload] : Array.from({ length: Math.max(Number(form.count) || 1, 1) }, (_, i) => {
      const d = fromKey(form.run_date)
      d.setDate(d.getDate() + i * every)
      return { ...payload, run_date: toKey(d) }
    })
    const { error } = run
      ? await supabase.from('runs').update(payload).eq('id', run.id)
      : await supabase.from('runs').insert(rows)
    setSaving(false)
    if (error) return setError(error.message)
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="card mb-4 space-y-3 p-4">
      <h2 className="label">{run ? 'Edit run' : 'New run'}</h2>
      <div>
        <label className="label" htmlFor="date">Date</label>
        <input id="date" type="date" required className="input" value={form.run_date} onChange={set('run_date')} />
      </div>
      {!run && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="repeat">Repeat</label>
            <select id="repeat" className="input" value={form.repeat} onChange={set('repeat')}>
              <option value="0">Just once</option>
              <option value="7">Every week</option>
              <option value="14">Every other week</option>
            </select>
          </div>
          {form.repeat !== '0' && (
            <div>
              <label className="label" htmlFor="count">How many runs</label>
              <input id="count" type="number" inputMode="numeric" min="1" max="52" className="input" value={form.count} onChange={set('count')} />
            </div>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="start">Start</label>
          <input id="start" type="time" required className="input" value={form.start_time} onChange={set('start_time')} />
        </div>
        <div>
          <label className="label" htmlFor="end">End</label>
          <input id="end" type="time" className="input" value={form.end_time} onChange={set('end_time')} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="gym">Location</label>
        <select id="gym" className="input" value={form.gym_id} onChange={set('gym_id')}>
          <option value="">Select a location</option>
          {gyms.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="price">Price ($)</label>
          <input id="price" type="number" inputMode="decimal" min="0" step="1" required className="input" value={form.price} onChange={set('price')} />
        </div>
        <div>
          <label className="label" htmlFor="cap">Max players</label>
          <input id="cap" type="number" inputMode="numeric" min="1" placeholder="No limit" className="input" value={form.capacity} onChange={set('capacity')} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="notes">Notes</label>
        <input id="notes" className="input" placeholder="Bring a dark & light shirt" value={form.notes} onChange={set('notes')} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button disabled={saving} className="btn-primary flex-1 py-3">{saving ? 'Saving…' : run ? 'Save changes' : form.repeat !== '0' ? `Add ${form.count} runs` : 'Add run'}</button>
        <button type="button" onClick={onDone} className="btn-ghost px-5">Cancel</button>
      </div>
    </form>
  )
}
