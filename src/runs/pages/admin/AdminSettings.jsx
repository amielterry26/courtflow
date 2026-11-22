import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { loadSettings } from '../../lib/pay'

const FIELDS = [
  { section: 'Payments', hint: 'Leave one blank to hide it as an option.' },
  { key: 'pay_name', label: 'Your name (shown to players)', placeholder: 'Amiel' },
  { key: 'cashapp_tag', label: 'Cash App $cashtag', placeholder: '$yourtag' },
  { key: 'apple_cash_phone', label: 'Apple Cash phone number', placeholder: '(702) 555-1234', type: 'tel' },
  { key: 'zelle', label: 'Zelle phone or email', placeholder: '(702) 555-1234' },
  { section: 'Pricing' },
  { key: 'default_price', label: 'Default price per run ($)', type: 'number' },
  { section: 'Membership (Stripe)', hint: 'The membership card shows on the site once the Payment Link is filled in.' },
  { key: 'stripe_membership_url', label: 'Stripe Payment Link', placeholder: 'https://buy.stripe.com/...' },
  { key: 'stripe_portal_url', label: 'Stripe customer portal link (cancel)', placeholder: 'https://billing.stripe.com/p/login/...' },
  { key: 'member_price', label: 'Membership price per month ($)', type: 'number' },
  { key: 'member_runs_per_month', label: 'Runs included per month', type: 'number' },
]

export default function AdminSettings() {
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('run_settings').select('*').eq('id', 1).single().then(({ data }) => setForm(data ?? {}))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const payload = {}
    for (const f of FIELDS) {
      if (!f.key) continue
      const v = String(form[f.key] ?? '').trim()
      payload[f.key] = f.type === 'number' ? Number(v) || 0 : v || null
    }
    payload.cashapp_tag = payload.cashapp_tag?.replace(/^\$/, '') || null
    payload.pay_name = payload.pay_name || 'Amiel'
    const { error } = await supabase.from('run_settings').update(payload).eq('id', 1)
    setSaving(false)
    if (error) return setError(error.message)
    loadSettings(true)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!form) return <p className="text-sm text-stone-500">Loading…</p>

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {FIELDS.map(f => f.section ? (
        <div key={f.section} className="pt-4 first:pt-0">
          <h2 className="font-serif text-xl font-semibold">{f.section}</h2>
          {f.hint && <p className="text-sm text-stone-500">{f.hint}</p>}
        </div>
      ) : (
        <div key={f.key}>
          <label className="label" htmlFor={f.key}>{f.label}</label>
          <input id={f.key} className="input" type={f.type === 'tel' ? 'tel' : f.type === 'number' ? 'number' : 'text'}
            inputMode={f.type === 'number' ? 'decimal' : undefined} placeholder={f.placeholder}
            value={form[f.key] ?? ''} onChange={e => setForm(s => ({ ...s, [f.key]: e.target.value }))} />
        </div>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="sticky bottom-4 pt-2">
        <button disabled={saving} className="btn-primary w-full py-3 text-base shadow-lg">
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save settings'}
        </button>
      </div>
    </form>
  )
}
