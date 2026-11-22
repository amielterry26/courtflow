import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { setMe } from '../lib/me'
import { basePath } from '../lib/division'
import SmsConsent from '../components/SmsConsent'

export default function Invite() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [valid, setValid] = useState(undefined)
  const [form, setForm] = useState({ first: '', last: '', phone: '', sms: false, level: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.rpc('runs_check_invite', { p_token: token }).then(({ data }) => setValid(data ?? false))
  }, [token])

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { data, error } = await supabase.rpc('runs_request', {
      p_first: form.first, p_last: form.last, p_phone: form.phone, p_invite: token, p_sms_opt_in: form.sms, p_level: form.level || null,
    })
    setBusy(false)
    if (error) return setError(error.message)
    if (data.status !== 'approved') return setError("Something's off with your account — text Amiel.")
    setMe(data.division, { player_id: data.player_id, first_name: data.first_name, last_name: data.last_name, is_member: data.is_member })
    navigate(`${basePath(data.division)}/`, { state: { welcome: `You're in, ${data.first_name}. Pick a run below.` } })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-court px-4 py-10">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[380px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,106,26,0.18),transparent_60%)]" />
      <div className="relative w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-hoop">CourtFlow Hoops · You're invited</p>
          <h1 className="mt-2 font-display text-7xl font-black uppercase leading-[0.85] tracking-tight">
            Join the<br /><span className="text-hoop">Runs.</span>
          </h1>
          <p className="mt-3 text-sm text-fg/75">Open gym pickup. Takes 10 seconds — just your name and number.</p>
        </div>

        {valid === false ? (
          <div className="card p-6 text-center text-sm text-fg/75">This invite link isn't valid anymore. Ask for a new one.</div>
        ) : (
          <form onSubmit={submit} className="card space-y-3 p-5">
            <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
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
            {valid === 'youth' && (
              <div>
                <label className="label" htmlFor="level">School</label>
                <select id="level" required className="input" value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}>
                  <option value="">Choose…</option>
                  <option value="hs">High school</option>
                  <option value="ms">Middle school</option>
                </select>
              </div>
            )}
            <SmsConsent checked={form.sms} onChange={sms => setForm(f => ({ ...f, sms }))} />
            {error && <p className="text-sm text-bad">{error}</p>}
            <button disabled={busy || !valid} className="btn-primary w-full py-3 text-base">
              {busy ? 'Joining…' : "I'm in"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
