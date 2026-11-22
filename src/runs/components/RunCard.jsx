import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getMe, getToken } from '../lib/me'
import { fromKey, timeRange, todayKey } from '../lib/dates'
import { mapsLinks, METHOD_LABELS } from '../lib/pay'
import PayInstructions from './PayInstructions'

export function runStatus(run) {
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

export default function RunCard({ run, onJoin, onShare, refreshKey }) {
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

  return (
    <div className={`card overflow-hidden ${open ? '' : 'opacity-60'}`}>
      <div className="flex items-stretch">
        <div className={`w-1.5 shrink-0 ${status === 'cancelled' ? 'bg-red-500' : open ? 'bg-hoop' : 'bg-line'}`} />
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display text-3xl font-extrabold uppercase leading-none tracking-tight">{timeRange(run.start_time, run.end_time)}</p>
              <p className="mt-1.5 font-semibold">{run.gym_name || 'Location TBD'}</p>
              {run.gym_address && <p className="text-sm text-muted">{run.gym_address}</p>}
            </div>
            <div className="shrink-0 rounded-xl bg-raised px-3 py-2 text-center">
              <p className="font-display text-2xl font-extrabold leading-none text-hoop">${Number(run.price)}</p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">per run</p>
            </div>
          </div>
          {run.notes && <p className="mt-2 text-sm text-fg/75">{run.notes}</p>}

          <div className="mt-3 flex flex-wrap gap-1.5">
            <Tag>{run.going} in</Tag>
            {spotsLeft !== null && open && <Tag tone={full ? 'muted' : 'green'}>{full ? 'Full' : `${spotsLeft} spots left`}</Tag>}
            {status === 'live' && <Tag tone="green">● Live now</Tag>}
            {status === 'ended' && <Tag tone="muted">Ended</Tag>}
            {status === 'cancelled' && <Tag tone="red">Cancelled</Tag>}
          </div>

          {open && (
            <>
              <div className="mt-4">
                {signup ? (
                  <div className="flex items-center justify-center gap-2 rounded-xl border border-hoop-line bg-hoop-soft py-3 font-semibold text-hoop">
                    ✓ You're in
                  </div>
                ) : (
                  <button onClick={onJoin} disabled={full} className="btn-primary w-full py-3.5 text-base">
                    {full ? 'Run is full' : 'Join this run'}
                  </button>
                )}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <a href={maps.apple} target="_blank" rel="noopener noreferrer" className="btn-ghost px-2 text-xs">Apple Maps</a>
                <a href={maps.google} target="_blank" rel="noopener noreferrer" className="btn-ghost px-2 text-xs">Google Maps</a>
                <button onClick={onShare} className="btn-ghost px-2 text-xs">↗ Share</button>
              </div>
              {maps.embed && (
                <div className="mt-2 text-center">
                  <button onClick={() => setShowMap(s => !s)} className="text-xs font-medium text-muted underline underline-offset-2">
                    {showMap ? 'Hide map' : 'Show map'}
                  </button>
                  {showMap && (
                    <iframe title="Map" src={maps.embed} loading="lazy"
                      className="mt-2 h-48 w-full rounded-xl border border-line [filter:invert(0.9)_hue-rotate(180deg)]" />
                  )}
                </div>
              )}
            </>
          )}

          {signup && (
            <div className="mt-4 border-t border-line pt-4">
              {signup.paid ? (
                <>
                  <p className="label">Who's running · {signup.roster.length}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {signup.roster.map((p, i) => (
                      <span key={i} className="rounded-lg bg-raised px-2.5 py-1 text-sm">{p.first_name} {p.last_initial}.</span>
                    ))}
                  </div>
                </>
              ) : (
                <div>
                  <p className="text-sm text-fg/75">
                    Payment pending{signup.payment_method ? ` (${METHOD_LABELS[signup.payment_method]})` : ''}. The roster unlocks once it's confirmed.
                  </p>
                  {signup.payment_method && getMe() && (
                    <button onClick={() => setShowPay(s => !s)} className="mt-2 text-sm font-semibold text-hoop">
                      {showPay ? 'Hide' : 'How to pay →'}
                    </button>
                  )}
                  {showPay && <div className="mt-3"><PayInstructions method={signup.payment_method} run={run} me={getMe()} /></div>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Tag({ tone = 'base', children }) {
  const tones = {
    base: 'bg-raised text-fg/85',
    green: 'bg-green-500/10 text-green-400',
    muted: 'bg-raised text-muted',
    red: 'bg-red-500/10 text-red-400',
  }
  return <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>
}
