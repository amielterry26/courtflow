import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import PlaceSearch from '../../components/PlaceSearch'

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

  async function deleteGym(g) {
    if (!confirm(`Delete ${g.name}? Runs there keep their date and time but lose the location.`)) return
    await supabase.from('gyms').delete().eq('id', g.id)
    if (editingId === g.id) cancel()
    load()
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">Search for the gym so Directions and the map work.</p>
        {!showForm && <button onClick={() => setShowForm(true)} className="btn-primary shrink-0 py-2">+ Location</button>}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-3 space-y-3 p-4">
          <h2 className="label">{editingId ? 'Edit location' : 'New location'}</h2>
          <PlaceSearch name={form.name} address={form.address} onChange={setForm} />
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
              <p className={`text-sm ${g.address ? 'text-muted' : 'text-hoop'}`}>{g.address || 'No address yet'}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => startEdit(g)} className="btn-ghost py-1.5 text-xs">Edit</button>
              <button onClick={() => deleteGym(g)} className="btn border border-bad/30 py-1.5 text-xs text-bad hover:bg-bad/10">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
