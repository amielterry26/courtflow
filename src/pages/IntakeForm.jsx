import { useState } from 'react'
import { supabase } from '../lib/supabase'

const BLANK = {
  child_name: '', age: '', grade: '', school: '', team: '', skill_level: '',
  goals: '', strengths: '', weaknesses: '',
  parent_name: '', parent_phone: '', parent_email: '',
}

export default function IntakeForm() {
  const [form, setForm] = useState(BLANK)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = { ...form, age: form.age ? parseInt(form.age) : null }

    const { error } = await supabase.from('intake_submissions').insert(payload)

    if (error) {
      setError('Something went wrong. Please try again.')
      setSaving(false)
    } else {
      // Send email notification to trainers (silent fail — DB save already succeeded)
      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key:  import.meta.env.VITE_WEB3FORMS_KEY,
          subject:     `New intake: ${form.child_name}`,
          from_name:   'CourtFlow Intake Form',
          message: [
            `Child: ${form.child_name}`,
            `Age: ${form.age || '—'}  |  Grade: ${form.grade || '—'}`,
            `School: ${form.school || '—'}  |  Team: ${form.team || '—'}`,
            `Skill level: ${form.skill_level || '—'}`,
            ``,
            `Goals: ${form.goals || '—'}`,
            `Strengths: ${form.strengths || '—'}`,
            `Improve: ${form.weaknesses || '—'}`,
            ``,
            `Parent: ${form.parent_name}`,
            `Phone: ${form.parent_phone || '—'}`,
            `Email: ${form.parent_email || '—'}`,
          ].join('\n'),
        }),
      }).catch(() => {})
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center py-12">
          <div className="text-5xl mb-4">🏀</div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">You're on deck!</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            We got {form.child_name}'s info. We'll reach out to {form.parent_name} soon with next steps.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 px-4 py-8">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏀</div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Join the Program</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Fill this out and we'll be in touch within 24 hours.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Section title="About Your Athlete">
            <Field label="Child's full name *" value={form.child_name} onChange={set('child_name')} required />
            <Row>
              <Field label="Age" value={form.age} onChange={set('age')} type="number" />
              <Field label="Grade" value={form.grade} onChange={set('grade')} />
            </Row>
            <Field label="School" value={form.school} onChange={set('school')} />
            <Field label="Team (if any)" value={form.team} onChange={set('team')} />
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Skill level</label>
              <select value={form.skill_level} onChange={set('skill_level')}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select level</option>
                <option value="beginner">Beginner — just starting out</option>
                <option value="intermediate">Intermediate — plays regularly</option>
                <option value="advanced">Advanced — high-level competition</option>
              </select>
            </div>
          </Section>

          <Section title="Development">
            <TextArea label="What are their goals?" value={form.goals} onChange={set('goals')} placeholder="e.g. Make varsity, improve shooting, develop handles..." />
            <TextArea label="What do they do well?" value={form.strengths} onChange={set('strengths')} placeholder="e.g. Great athlete, high IQ, strong defender..." />
            <TextArea label="What do they want to improve?" value={form.weaknesses} onChange={set('weaknesses')} placeholder="e.g. Ball handling, shooting off the dribble..." />
          </Section>

          <Section title="Parent / Guardian">
            <Field label="Your name *" value={form.parent_name} onChange={set('parent_name')} required />
            <Field label="Phone number" value={form.parent_phone} onChange={set('parent_phone')} type="tel" />
            <Field label="Email" value={form.parent_email} onChange={set('parent_email')} type="email" />
          </Section>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base transition-colors disabled:opacity-50">
            {saving ? 'Submitting...' : 'Submit intake form'}
          </button>

          <p className="text-xs text-zinc-400 text-center pb-8">
            We'll review this and reach out to schedule a session.
          </p>
        </form>
      </div>
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

function Field({ label, required, type = 'text', value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{label}</label>
      <input type={type} required={required} value={value ?? ''} onChange={onChange} placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  )
}

function TextArea({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{label}</label>
      <textarea value={value ?? ''} onChange={onChange} rows={3} placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
    </div>
  )
}
