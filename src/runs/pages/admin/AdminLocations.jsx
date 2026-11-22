import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

// Same gyms table the trainer app uses
const BLANK = { name: '', address: '' }

export default function AdminLocations() {
  const [gyms, setGyms] = useState([])
  const [form, setForm] = useState(BLANK)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('gyms').select('*').order('name')
    setGyms(data ?? [])
  }

  function startEdit(g) {
    setForm({ name: g.name, address: g.address ?? '' })
    setEditingId(g.id)
    setShowForm(true)
  }

  function cancel() {
    setShowForm(false)
    setEditingId(null)
    setForm(BLANK)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const payload = { name: form.name, address: form.address || null }
    if (editingId) await supabase.from('gyms').update(payload).eq('id', editingId)
    else await supabase.from('gyms').insert(payload)
    cancel()
    load()
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-stone-500">Add the full address so Directions and the map work.</p>
        {!showForm && <button onClick={() => setShowForm(true)} className="btn-primary shrink-0 py-2">+ Location</button>}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-3 space-y-3 p-4">
          <input required className="input" placeholder="Name (e.g. Atlas Hoops)" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input className="input" placeholder="Address" value={form.address}
            onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          <div className="flex gap-2">
            <button className="btn-primary flex-1">{editingId ? 'Save' : 'Add location'}</button>
            <button type="button" onClick={cancel} className="btn-ghost px-5">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {gyms.map(g => (
          <div key={g.id} className="card flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-semibold">{g.name}</p>
              <p className={`text-sm ${g.address ? 'text-stone-500' : 'text-ember'}`}>{g.address || 'No address yet'}</p>
            </div>
            <button onClick={() => startEdit(g)} className="btn-ghost shrink-0 py-1.5 text-xs">Edit</button>
          </div>
        ))}
      </div>
    </div>
  )
}
