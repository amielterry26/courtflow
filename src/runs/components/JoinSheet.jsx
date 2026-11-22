import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getMe, setMe, setToken, forgetMe } from '../lib/me'
import { payMethods, useSettings } from '../lib/pay'
import { shortDate, timeRange } from '../lib/dates'
import PayInstructions from './PayInstructions'

// Steps: who → (new) → pay → done | requested
export default function JoinSheet({ run, onClose, onJoined }) {
  const [me, setMeState] = useState(getMe())
  const [step, setStep] = useState(me ? 'pay' : 'who')
  const [names, setNames] = useState([])
  const [pickedId, setPickedId] = useState('')
  const [method, setMethod] = useState('')
  const [form, setForm] = useState({ first: '', last: '', phone: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const settings = useSettings()

  useEffect(() => {
    supabase.rpc('runs_player_names').then(({ data }) => {
      setNames(data ?? [])
      // Keep membership status fresh for a remembered player
      const fresh = me && data?.find(n => n.id === me.player_id)
      if (fresh) remember({ ...me, is_member: fresh.is_member })
      else if (me && data) { forgetMe(); setMeState(null); setStep('who') }
    })
  }, [])

  function remember(next) {
    setMe(next)
    setMeState(next)
  }

  function pickName() {
    const n = names.find(n => n.id === pickedId)
    if (!n) return
    remember({ player_id: n.id, first_name: n.first_name, last_name: n.last_name, is_member: n.is_member })
    setStep('pay')
  }

  function notMe() {
    forgetMe()
    setMeState(null)
    setStep('who')
  }

  async function submitRequest(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { data, error } = await supabase.rpc('runs_request', {
      p_first: form.first, p_last: form.last, p_phone: form.phone, p_run: run.id,
    })
    setBusy(false)
    if (error) return setError(error.message)
    if (data.status === 'approved') {
      // Already on the list — treat them like a returning player
      remember({ player_id: data.player_id, first_name: data.first_name, last_name: data.last_name, is_member: data.is_member })
      if (data.token) setToken(run.id, data.token)
      setStep('pay')
    } else {
      setStep('requested')
      onJoined()
    }
  }

  async function join() {
    setBusy(true)
    setError('')
    const { data, error } = await supabase.rpc('runs_join', { p_run: run.id, p_player: me.player_id, p_method: method })
    setBusy(false)
    if (error) return setError(error.message)
    setToken(run.id, data)
    setStep('done')
    onJoined()
  }

  const base = settings ? payMethods(settings) : []
  const methods = me?.is_member ? [{ id: 'member', label: 'Membership', icon: '⭐' }, ...base] : base

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] bg-cream px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl sm:max-w-md sm:rounded-[28px] sm:pb-6">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-sand-line sm:hidden" />
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ember">{shortDate(run.run_date)}</p>
            <h3 className="font-serif text-2xl font-semibold leading-tight">{run.gym_name || 'Pickup run'}</h3>
            <p className="text-sm text-stone-500">{timeRange(run.start_time, run.end_time)} · ${Number(run.price)}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="-mr-1 rounded-full p-2 text-xl leading-none text-stone-400 hover:bg-sand">×</button>
        </div>

        {step === 'who' && (
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="who">Who's playing?</label>
              <select id="who" className="input" value={pickedId} onChange={e => setPickedId(e.target.value)}>
                <option value="">Select your name</option>
                {names.map(n => <option key={n.id} value={n.id}>{n.first_name} {n.last_name}</option>)}
              </select>
            </div>
            <button disabled={!pickedId} onClick={pickName} className="btn-primary w-full py-3 text-base">Continue</button>
            <div className="flex items-center gap-3 text-xs text-stone-400">
              <span className="h-px flex-1 bg-sand-line" /> not on the list? <span className="h-px flex-1 bg-sand-line" />
            </div>
            <button onClick={() => setStep('new')} className="btn-ghost w-full py-3 text-base">I'm new — request to join</button>
          </div>
        )}

        {step === 'new' && (
          <form onSubmit={submitRequest} className="space-y-3">
            <p className="text-sm text-stone-600">Runs are invite only. Send a request and you'll get a text once you're approved.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="first">First name</label>
                <input id="first" required autoComplete="given-name" className="input" value={form.first}
                  onChange={e => setForm(f => ({ ...f, first: e.target.value }))} />
              </div>
              <div>
                <label className="label" htmlFor="last">Last name</label>
                <input id="last" required autoComplete="family-name" className="input" value={form.last}
                  onChange={e => setForm(f => ({ ...f, last: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="phone">Phone</label>
              <input id="phone" required type="tel" inputMode="tel" autoComplete="tel" className="input" placeholder="(702) 555-1234"
                value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button disabled={busy} className="btn-primary w-full py-3 text-base">{busy ? 'Sending…' : 'Send request'}</button>
            <button type="button" onClick={() => setStep('who')} className="w-full py-2 text-sm text-stone-500">← Back</button>
          </form>
        )}

        {step === 'pay' && me && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl bg-sand px-4 py-3">
              <span className="text-sm">Playing as <b>{me.first_name} {me.last_name}</b></span>
              <button onClick={notMe} className="text-xs font-medium text-ember">Not you?</button>
            </div>
            <div>
              <p className="label">How are you paying?</p>
              <div className="grid grid-cols-2 gap-2">
                {methods.map(m => (
                  <button key={m.id} onClick={() => setMethod(m.id)}
                    className={`flex items-center gap-2 rounded-2xl border px-3 py-3.5 text-left text-sm font-medium transition
                      ${method === m.id ? 'border-ember bg-ember-soft text-ember-dark ring-1 ring-ember' : 'border-sand-line bg-white hover:bg-sand'}`}>
                    <span className="text-lg">{m.icon}</span>{m.label}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button disabled={!method || busy} onClick={join} className="btn-primary w-full py-3 text-base">
              {busy ? 'Saving…' : "I'm in"}
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-ember-soft px-4 py-3 text-ember-dark">
              <p className="font-serif text-xl font-semibold">You're on the list 🏀</p>
              <p className="text-sm">
                {method === 'member' ? 'Member run booked.' : "Once your payment's confirmed you'll see who else is running."}
              </p>
            </div>
            <PayInstructions method={method} run={run} me={me} />
            <button onClick={onClose} className="btn-ghost w-full py-3">Done</button>
          </div>
        )}

        {step === 'requested' && (
          <div className="space-y-4 text-center">
            <p className="font-serif text-2xl font-semibold">Request sent</p>
            <p className="text-sm text-stone-600">
              We'll text you at the number you gave once you're approved. Hold off on paying until then.
            </p>
            <button onClick={onClose} className="btn-primary w-full py-3">Got it</button>
          </div>
        )}
      </div>
    </div>
  )
}
