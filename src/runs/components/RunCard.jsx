import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getMe, getToken } from '../lib/me'
import { fromKey, timeRange, todayKey, shortDate } from '../lib/dates'
import { mapsLinks, METHOD_LABELS } from '../lib/pay'
import PayInstructions from './PayInstructions'

function runStatus(run) {
  if (run.cancelled) return 'cancelled'
  const today = todayKey()
  if (run.run_date < today) return 'ended'
  if (run.run_date > today) return 'upcoming'
  const now = new Date()
  const at = t => { const [h, m] = t.split(':').map(Number); const d = fromKey(run.run_date); d.setHours(h, m); return d }
  if (now < at(run.start_time)) return 'upcoming'
  if (!run.end_time || now < at(run.end_time)) return 'live'
  return 'ended'
}

export default function RunCard({ run, onJoin, refreshKey }) {
  const [signup, setSignup] = useState(null)
  const [showMap, setShowMap] = useState(false)
  const [showPay, setShowPay] = useState(false)
  const token = getToken(run.id)
  const status = runStatus(run)
  const maps = mapsLinks(run)
  const spotsLeft = run.capacity ? Math.max(run.capacity - run.going, 0) : null
  const full = spotsLeft === 0
  const open = status === 'upcoming' || status === 'live'

  useEffect(() => {
    if (!token) return setSignup(null)
    supabase.rpc('runs_roster', { p_token: token }).then(({ data }) => setSignup(data))
  }, [token, refreshKey])

  async function share() {
    const text = `Pickup run ${shortDate(run.run_date)}, ${timeRange(run.start_time, run.end_time)} at ${run.gym_name ?? 'TBD'}`
    if (navigator.share) {
      try { await navigator.share({ title: 'Pickup run', text, url: window.location.origin }) } catch { /* dismissed */ }
    } else {
      await navigator.clipboard?.writeText(`${text} — ${window.location.origin}`)
    }
  }

  return (
    <div className={`card p-5 text-center ${status === 'ended' || status === 'cancelled' ? 'opacity-70' : ''}`}>
      <h3 className="font-serif text-xl font-semibold leading-snug">{run.gym_name || 'Location TBD'}</h3>
      <p className="mt-0.5 font-semibold">{timeRange(run.start_time, run.end_time)}</p>
      {run.gym_address && <p className="mt-0.5 text-sm text-stone-500">{run.gym_address}</p>}
      {run.notes && <p className="mt-1 text-sm text-stone-500">{run.notes}</p>}

      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        <Chip tone="ember">${Number(run.price)}</Chip>
        <Chip>{run.going} going</Chip>
        {spotsLeft !== null && open && <Chip tone={full ? 'stone' : 'green'}>{full ? 'Full' : `${spotsLeft} spots left`}</Chip>}
        {status === 'live' && <Chip tone="green"><Dot /> Happening now</Chip>}
        {status === 'ended' && <Chip tone="stone">Ended</Chip>}
        {status === 'cancelled' && <Chip tone="red">Cancelled</Chip>}
      </div>

      {open && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {signup ? (
            <span className="btn border border-ember bg-ember-soft text-ember-dark">✓ You're in</span>
          ) : (
            <button onClick={onJoin} disabled={full} className="btn-primary px-6">{full ? 'Run is full' : "🏀 I'm in"}</button>
          )}
          <a href={maps.apple} target="_blank" rel="noopener noreferrer" className="btn-ghost">🧭 Apple Maps</a>
          <a href={maps.google} target="_blank" rel="noopener noreferrer" className="btn-ghost">📍 Google Maps</a>
          <button onClick={share} className="btn-ghost">↗ Share</button>
        </div>
      )}

      {maps.embed && open && (
        <div className="mt-3">
          <button onClick={() => setShowMap(s => !s)} className="text-xs font-medium text-stone-500 underline underline-offset-2">
            {showMap ? 'Hide map' : 'Show map'}
          </button>
          {showMap && (
            <iframe title="Map" src={maps.embed} loading="lazy"
              className="mt-2 h-48 w-full rounded-2xl border border-sand-line" />
          )}
        </div>
      )}

      {signup && (
        <div className="mt-4 border-t border-sand-line pt-4 text-left">
          {signup.paid ? (
            <>
              <p className="label text-center">Who's running · {signup.roster.length}</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {signup.roster.map((p, i) => (
                  <span key={i} className="rounded-full bg-sand px-3 py-1 text-sm">{p.first_name} {p.last_initial}.</span>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center">
              <p className="text-sm text-stone-600">
                Payment pending{signup.payment_method ? ` (${METHOD_LABELS[signup.payment_method]})` : ''} — the roster unlocks once it's confirmed.
              </p>
              {signup.payment_method && getMe() && (
                <button onClick={() => setShowPay(s => !s)} className="mt-2 text-sm font-medium text-ember">
                  {showPay ? 'Hide' : 'How to pay'}
                </button>
              )}
              {showPay && <div className="mt-3 text-left"><PayInstructions method={signup.payment_method} run={run} me={getMe()} /></div>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Chip({ tone = 'sand', children }) {
  const tones = {
    sand: 'bg-sand text-stone-700 border-sand-line',
    ember: 'bg-ember-soft text-ember-dark border-ember-line',
    green: 'bg-green-50 text-green-800 border-green-200',
    stone: 'bg-stone-100 text-stone-500 border-stone-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  }
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>
}

function Dot() {
  return <span className="h-1.5 w-1.5 rounded-full bg-current" />
}
