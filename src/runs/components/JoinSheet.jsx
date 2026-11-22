import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getMe, setMe, getPending, setPending, setToken, forgetMe } from '../lib/me'
import { payMethods, useSettings } from '../lib/pay'
import { notifyRequest } from '../lib/notify'
import { pushRequest } from '../lib/push'
import { shortDate, timeRange } from '../lib/dates'
import PayInstructions from './PayInstructions'
import SmsConsent from './SmsConsent'

// Steps: who → (new → requested) | pay → done
// Members skip picking a payment method.
export default function JoinSheet({ run, onClose, onJoined }) {
  const division = run.division
  const [me, setMeState] = useState(getMe(division))
  const [step, setStep] = useState(me ? 'pay' : 'who')
  const [names, setNames] = useState(null)
  const [pickedId, setPickedId] = useState(getPending(division)?.player_id ?? '')
  const [method, setMethod] = useState('')
  const [form, setForm] = useState({ first: '', last: '', phone: '', sms: false })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [memberFallback, setMemberFallback] = useState(false)
  const settings = useSettings(division)

  useEffect(() => {
    supabase.rpc('runs_player_names', { p_division: division }).then(({ data }) => {
      const list = data ?? []
      setNames(list)
      const current = getMe(division)
      const fresh = current && list.find(n => n.id === current.player_id)
      if (fresh) {
        remember({ ...current, is_member: fresh.is_member })
        return
      }
      if (current) { forgetMe(division); setMeState(null); setStep('who') }
      // Requested earlier on this phone and now approved → straight to paying
      const pending = getPending(division)
      const approved = pending && list.find(n => n.id === pending.player_id)
      if (approved) {
        remember({ player_id: approved.id, first_name: approved.first_name, last_name: approved.last_name, is_member: approved.is_member })
        setStep('pay')
      }
    })
  }, [])

  function remember(next) {
    setMe(division, next)
    setMeState(next)
  }

  function pickName() {
    const n = names.find(n => n.id === pickedId)
    if (!n) return
    remember({ player_id: n.id, first_name: n.first_name, last_name: n.last_name, is_member: n.is_member })
    setStep('pay')
  }

  function notMe() {
    forgetMe(division)
    setMeState(null)
    setPickedId('')
    setStep('who')
  }

  async function submitRequest(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { data, error } = await supabase.rpc('runs_request', {
      p_first: form.first, p_last: form.last, p_phone: form.phone, p_run: run.id, p_sms_opt_in: form.sms,
    })
    if (error) { setBusy(false); return setError(error.message) }
    if (data.status === 'approved') {
      // Already on the list — treat them like a returning player
      remember({ player_id: data.player_id, first_name: data.first_name, last_name: data.last_name, is_member: data.is_member })
      if (data.token) setToken(run.id, data.token)
      setBusy(false)
      setStep('pay')
      return
    }
    if (data.status === 'pending') {
      setPending(division, { player_id: data.player_id })
      await Promise.all([notifyRequest(data, run, form.phone), pushRequest(data.player_id)])
    }
    setBusy(false)
    setStep('requested')
    onJoined()
  }

  async function join(m) {
    setBusy(true)
    setError('')
    const { data, error } = await supabase.rpc('runs_join', { p_run: run.id, p_player: me.player_id, p_method: m })
    setBusy(false)
    if (error) {
      setError(error.message)
      if (m === 'member') setMemberFallback(true)
      return
    }
    setMethod(m)
    setToken(run.id, data)
    setStep('done')
    onJoined()
  }

  const price = Number(run.price)
  const isMember = me?.is_member && !memberFallback

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-line bg-surface px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 sm:max-w-md sm:rounded-3xl sm:pb-6">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line sm:hidden" />
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="label mb-0.5 text-hoop">{shortDate(run.run_date)}</p>
            <h3 className="font-display text-3xl font-extrabold uppercase leading-none">{run.gym_name || 'Pickup run'}</h3>
            <p className="mt-1 text-sm text-muted">{timeRange(run.start_time, run.end_time)} · ${price}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="-mr-1 rounded-lg p-2 text-2xl leading-none text-muted">×</button>
        </div>

        {step === 'who' && (
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="who">Select your name</label>
              <select id="who" className="input" value={pickedId} onChange={e => setPickedId(e.target.value)}>
                <option value="">{names ? 'Choose…' : 'Loading…'}</option>
                {names?.map(n => <option key={n.id} value={n.id}>{n.first_name} {n.last_name}</option>)}
              </select>
            </div>
            <button disabled={!names?.some(n => n.id === pickedId)} onClick={pickName} className="btn-primary w-full py-3.5 text-base">Continue</button>
            <div className="flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-line" /> Not on the list? <span className="h-px flex-1 bg-line" />
            </div>
            <button onClick={() => setStep('new')} className="btn-ghost w-full py-3.5 text-base">Request to join</button>
          </div>
        )}

        {step === 'new' && (
          <form onSubmit={submitRequest} className="space-y-3">
            <p className="text-sm text-fg/75">Runs are invite only. Send a request and you'll hear back once you're approved. Then come back and grab your spot.</p>
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
            <SmsConsent checked={form.sms} onChange={sms => setForm(f => ({ ...f, sms }))} />
            {error && <p className="text-sm text-bad">{error}</p>}
            <button disabled={busy} className="btn-primary w-full py-3.5 text-base">{busy ? 'Sending…' : 'Send request'}</button>
            <button type="button" onClick={() => setStep('who')} className="w-full py-2 text-sm text-muted">← Back</button>
          </form>
        )}

        {step === 'pay' && me && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-raised px-4 py-3">
              <span className="text-sm">
                <b>{me.first_name} {me.last_name}</b>
                {isMember && <span className="ml-2 rounded bg-hoop-soft px-1.5 py-0.5 text-xs font-semibold text-hoop">♾ Unlimited</span>}
              </span>
              <button onClick={notMe} className="text-xs font-semibold text-hoop">Not you?</button>
            </div>

            {isMember ? (
              <>
                <p className="text-sm text-fg/75">You're on Unlimited. Nothing to pay.</p>
                <button disabled={busy} onClick={() => join('member')} className="btn-primary w-full py-3.5 text-base">
                  {busy ? 'Saving…' : 'Lock in my spot'}
                </button>
              </>
            ) : (
              <>
                <div>
                  <p className="font-display text-2xl font-extrabold uppercase leading-tight">Runs are ${price}.</p>
                  <p className="mb-3 text-sm text-muted">How are you paying?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(settings ? payMethods(settings) : []).map(m => (
                      <button key={m.id} onClick={() => setMethod(m.id)}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-3.5 text-left text-sm font-semibold transition
                          ${method === m.id ? 'border-hoop bg-hoop-soft text-hoop' : 'border-line bg-raised hover:border-muted/50'}`}>
                        <span className="text-lg">{m.icon}</span>{m.label}
                      </button>
                    ))}
                  </div>
                </div>
                {error && <p className="text-sm text-bad">{error}</p>}
                <button disabled={!method || busy} onClick={() => join(method)} className="btn-primary w-full py-3.5 text-base">
                  {busy ? 'Saving…' : "I'm in"}
                </button>
              </>
            )}
            {isMember && error && <p className="text-sm text-bad">{error}</p>}
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-hoop-line bg-hoop-soft px-4 py-3">
              <p className="font-display text-2xl font-extrabold uppercase text-hoop">You're on the list 🏀</p>
              <p className="text-sm text-fg/80">
                {method === 'member' ? 'Unlimited run booked. See you on the court.' : "Once your payment's confirmed you'll see who else is running."}
              </p>
            </div>
            {method !== 'member' && <PayInstructions method={method} run={run} me={me} />}
            <button onClick={onClose} className="btn-ghost w-full py-3">Done</button>
          </div>
        )}

        {step === 'requested' && (
          <div className="space-y-4 text-center">
            <p className="font-display text-3xl font-extrabold uppercase">Request sent</p>
            <p className="text-sm text-fg/75">
              You'll get a text once you're approved. Then come back here, tap Join, and you're set. Hold off on paying until then.
            </p>
            <button onClick={onClose} className="btn-primary w-full py-3">Got it</button>
          </div>
        )}
      </div>
    </div>
  )
}
