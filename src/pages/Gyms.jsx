import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const BLANK = { name: '', address: '', maps_url: '', notes: '' }

export default function Gyms() {
  const navigate = useNavigate()
  const [gyms, setGyms] = useState([])
  const [form, setForm] = useState(BLANK)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('gyms').select('*').order('name')
    setGyms(data ?? [])
  }

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  function startAdd() {
    setForm(BLANK)
    setEditingId(null)
    setShowForm(true)
  }

  function startEdit(gym) {
    setForm({ name: gym.name, address: gym.address ?? '', maps_url: gym.maps_url ?? '', notes: gym.notes ?? '' })
    setEditingId(gym.id)
    setShowForm(true)
  }

  function cancel() {
    setShowForm(false)
    setEditingId(null)
    setForm(BLANK)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      name: form.name,
      address: form.address || null,
      maps_url: form.maps_url || null,
      notes: form.notes || null,
    }
    if (editingId) {
      await supabase.from('gyms').update(payload).eq('id', editingId)
    } else {
      await supabase.from('gyms').insert(payload)
    }
    await load()
    cancel()
    setSaving(false)
  }

  async function deleteGym(id) {
    if (!confirm('Delete this gym? Sessions using it will lose the location.')) return
    await supabase.from('gyms').delete().eq('id', id)
    setGyms(prev => prev.filter(g => g.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">← Back</button>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Gyms & Locations</h1>
        </div>
        {!showForm && (
          <button onClick={startAdd}
            className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors">
            + Add gym
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 mb-4 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            {editingId ? 'Edit Gym' : 'New Gym'}
          </h2>
          <Field label="Name *" value={form.name} onChange={set('name')} required />
          <Field label="Address" value={form.address} onChange={set('address')} placeholder="123 Main St, Las Vegas, NV" />
          <Field label="Maps URL" value={form.maps_url} onChange={set('maps_url')} placeholder="Google or Apple Maps link" />
          <TextArea label="Notes" value={form.notes} onChange={set('notes')} placeholder="Rental cost, hours, contact info..." />
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : editingId ? 'Save changes' : 'Add gym'}
            </button>
            <button type="button" onClick={cancel}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {gyms.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 text-center text-zinc-400 text-sm">
            No gyms yet. Add your first location.
          </div>
        ) : (
          gyms.map(gym => (
            <div key={gym.id} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">{gym.name}</p>
                  {gym.address && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{gym.address}</p>
                  )}
                  {gym.notes && (
                    <p className="text-sm text-zinc-400 mt-1">{gym.notes}</p>
                  )}
                  {gym.maps_url && (
                    <a href={gym.maps_url} target="_blank" rel="noopener noreferrer"
                      className="inline-block mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                      📍 Open in Maps
                    </a>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => startEdit(gym)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                    Edit
                  </button>
                  <button onClick={() => deleteGym(gym.id)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-900 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function Field({ label, required, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{label}</label>
      <input type="text" required={required} value={value} onChange={onChange} placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  )
}

function TextArea({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{label}</label>
      <textarea value={value} onChange={onChange} rows={3} placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
    </div>
  )
}
