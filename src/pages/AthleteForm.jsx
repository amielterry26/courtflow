import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const BLANK = {
  first_name: '', last_name: '', age: '', grade: '', school: '', team: '',
  position: '', favorite_player: '', parent_name: '', parent_phone: '',
  parent_email: '', skill_level: '', goals: '', strengths: '', weaknesses: '', notes: '',
  sessions_purchased: '', sessions_used: '',
}

export default function AthleteForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isEdit) {
      supabase.from('athletes').select('*').eq('id', id).single().then(({ data }) => {
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

    const payload = {
      ...form,
      age: form.age ? parseInt(form.age) : null,
      sessions_purchased: form.sessions_purchased ? parseInt(form.sessions_purchased) : null,
      sessions_used: form.sessions_used ? parseInt(form.sessions_used) : null,
    }

    const { error } = isEdit
      ? await supabase.from('athletes').update(payload).eq('id', id)
      : await supabase.from('athletes').insert(payload)

    if (error) {
      setError(error.message)
      setSaving(false)
    } else {
      navigate('/athletes')
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this athlete? This cannot be undone.')) return
    await supabase.from('athletes').delete().eq('id', id)
    navigate('/athletes')
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
          ← Back
        </button>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          {isEdit ? 'Edit Athlete' : 'New Athlete'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Section title="Basic Info">
          <Row>
            <Field label="First name *" value={form.first_name} onChange={set('first_name')} required />
            <Field label="Last name *" value={form.last_name} onChange={set('last_name')} required />
          </Row>
          <Row>
            <Field label="Age" value={form.age} onChange={set('age')} type="number" />
            <Field label="Grade" value={form.grade} onChange={set('grade')} />
          </Row>
          <Field label="School" value={form.school} onChange={set('school')} />
          <Row>
            <Field label="Team" value={form.team} onChange={set('team')} />
            <Field label="Position" value={form.position} onChange={set('position')} />
          </Row>
          <Field label="Favorite player" value={form.favorite_player} onChange={set('favorite_player')} />
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Skill level</label>
            <select
              value={form.skill_level}
              onChange={set('skill_level')}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select level</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </Section>

        <Section title="Parent / Guardian">
          <Field label="Parent name" value={form.parent_name} onChange={set('parent_name')} />
          <Row>
            <Field label="Phone" value={form.parent_phone} onChange={set('parent_phone')} type="tel" />
            <Field label="Email" value={form.parent_email} onChange={set('parent_email')} type="email" />
          </Row>
        </Section>

        <Section title="Session Pack">
          <Row>
            <Field label="Sessions purchased" value={form.sessions_purchased} onChange={set('sessions_purchased')} type="number" />
            <Field label="Sessions used" value={form.sessions_used} onChange={set('sessions_used')} type="number" />
          </Row>
        </Section>

        <Section title="Development">
          <TextArea label="Goals" value={form.goals} onChange={set('goals')} />
          <TextArea label="Strengths" value={form.strengths} onChange={set('strengths')} />
          <TextArea label="Weaknesses" value={form.weaknesses} onChange={set('weaknesses')} />
          <TextArea label="Notes" value={form.notes} onChange={set('notes')} />
        </Section>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 pb-6">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create athlete'}
          </button>
          {isEdit && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-3 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950 dark:hover:bg-red-900 text-red-600 dark:text-red-400 font-medium transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
      <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{title}</h2>
      {children}
    </div>
  )
}

function Row({ children }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>
}

function Field({ label, required, type = 'text', value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{label}</label>
      <input
        type={type}
        required={required}
        value={value ?? ''}
        onChange={onChange}
        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}

function TextArea({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{label}</label>
      <textarea
        value={value ?? ''}
        onChange={onChange}
        rows={3}
        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />
    </div>
  )
}
