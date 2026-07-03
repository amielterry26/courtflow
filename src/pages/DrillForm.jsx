import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const BLANK = {
  title: '', category: '', difficulty: '', description: '', instructions: '', reps_or_time: '',
}

export default function DrillForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isEdit) {
      supabase.from('drills').select('*').eq('id', id).single().then(({ data }) => {
        if (data) setForm(data)
      })
    }
  }, [id, isEdit])

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { error } = isEdit
      ? await supabase.from('drills').update(form).eq('id', id)
      : await supabase.from('drills').insert(form)

    if (error) { setError(error.message); setSaving(false) }
    else navigate('/drills')
  }

  async function handleDelete() {
    if (!confirm('Delete this drill?')) return
    await supabase.from('drills').delete().eq('id', id)
    navigate('/drills')
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">← Back</button>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{isEdit ? 'Edit Drill' : 'New Drill'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
          <Field label="Title *" value={form.title} onChange={set('title')} required />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Category *</label>
              <select required value={form.category} onChange={set('category')}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select</option>
                {['ball handling','shooting','finishing','footwork','defense','conditioning','IQ','warmup'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Difficulty *</label>
              <select required value={form.difficulty} onChange={set('difficulty')}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <Field label="Reps / Time (e.g. 3×10 or 2 mins)" value={form.reps_or_time} onChange={set('reps_or_time')} />
          <TextArea label="Description" value={form.description} onChange={set('description')} />
          <TextArea label="Instructions" value={form.instructions} onChange={set('instructions')} rows={5} />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 pb-6">
          <button type="submit" disabled={saving}
            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create drill'}
          </button>
          {isEdit && (
            <button type="button" onClick={handleDelete}
              className="px-4 py-3 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950 dark:hover:bg-red-900 text-red-600 dark:text-red-400 font-medium transition-colors">
              Delete
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

function Field({ label, required, type = 'text', value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{label}</label>
      <input type={type} required={required} value={value ?? ''} onChange={onChange}
        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  )
}

function TextArea({ label, value, onChange, rows = 3 }) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{label}</label>
      <textarea value={value ?? ''} onChange={onChange} rows={rows}
        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
    </div>
  )
}
