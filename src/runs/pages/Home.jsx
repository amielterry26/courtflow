import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getMe } from '../lib/me'
import { fromKey, monthGrid, toKey, todayKey, relativeDay, shortDate, timeRange, weekday } from '../lib/dates'
import { membershipLink, useSettings } from '../lib/pay'
import Calendar from '../components/Calendar'
import RunCard from '../components/RunCard'
import JoinSheet from '../components/JoinSheet'
import ShareSheet from '../components/ShareSheet'
import ThemeToggle from '../components/ThemeToggle'

export default function Home() {
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const linkedDate = /^\d{4}-\d{2}-\d{2}$/.test(params.get('date') ?? '') ? params.get('date') : null
  const start = linkedDate ? fromKey(linkedDate) : new Date()
  const [ym, setYm] = useState({ y: start.getFullYear(), m: start.getMonth() })
  const [runs, setRuns] = useState([])
  const [upcoming, setUpcoming] = useState([])
  const [selected, setSelected] = useState(linkedDate ?? todayKey())
  const [joining, setJoining] = useState(null)
  const [sharing, setSharing] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [welcome, setWelcome] = useState(location.state?.welcome ?? null)
  const panelRef = useRef(null)
  const settings = useSettings()

  // Runs for the visible 6-week grid
  useEffect(() => {
    const grid = monthGrid(ym.y, ym.m)
    supabase.rpc('runs_calendar', { p_from: toKey(grid[0]), p_to: toKey(grid[41]) }).then(({ data }) => {
      const list = data ?? []
      setRuns(list)
      // Link from an approval text (?join=<run id>) opens the join sheet
      const joinId = params.get('join')
      const target = joinId && list.find(r => r.id === joinId)
      if (target) {
        setJoining(target)
        params.delete('join')
        setParams(params, { replace: true })
      }
    })
  }, [ym, refreshKey])

  // Next few runs for the hero, regardless of month
  useEffect(() => {
    const until = new Date()
    until.setDate(until.getDate() + 120)
    supabase.rpc('runs_calendar', { p_from: todayKey(), p_to: toKey(until) }).then(({ data }) => {
      const list = (data ?? []).filter(r => !r.cancelled)
      setUpcoming(list)
      // First load without a shared date: jump to the next run
      if (list[0] && refreshKey === 0 && !linkedDate) {
        setSelected(list[0].run_date)
        const d = fromKey(list[0].run_date)
        setYm({ y: d.getFullYear(), m: d.getMonth() })
      }
    })
  }, [refreshKey])

  const runsByDate = useMemo(() => {
    const map = {}
    for (const r of runs) (map[r.run_date] ??= []).push(r)
    return map
  }, [runs])

  const dayRuns = runsByDate[selected] ?? []
  const next = upcoming[0]
  const nextAfterSelected = upcoming.find(r => r.run_date > selected)

  function select(key, scroll = true) {
    setSelected(key)
    const d = fromKey(key)
    if (d.getMonth() !== ym.m || d.getFullYear() !== ym.y) setYm({ y: d.getFullYear(), m: d.getMonth() })
    // On phones the panel sits under the calendar — bring it into view
    if (scroll && window.innerWidth < 1024) setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const me = getMe()
  const selDate = fromKey(selected)

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-court text-fg">
      <CourtLines />

      <header className="relative z-10 border-b border-line/70 bg-court/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="flex items-center gap-2">
            <Ball />
            <span className="font-display text-xl font-extrabold uppercase tracking-wide">CourtFlow Hoops</span>
            <span className="rounded bg-hoop px-1.5 py-0.5 font-display text-xs font-extrabold uppercase tracking-wider text-white">Runs</span>
          </span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/admin" className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:text-fg">Admin</Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-16">
        {/* Hero */}
        <section className="grid items-end gap-8 pt-10 sm:pt-16 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-hoop">
              <span className="h-px w-6 bg-hoop" /> Invite only · Open gym
            </p>
            <h1 className="mt-3 font-display text-[64px] font-black uppercase leading-[0.85] tracking-tight sm:text-[96px]">
              Pickup<br /><span className="text-hoop">Runs.</span>
            </h1>
            <p className="mt-4 max-w-sm text-[15px] text-fg/70">
              Pick a date, grab your spot, pay, and hoop. New here? Request to join.
            </p>
          </div>

          {next && (
            <div className="card relative overflow-hidden">
              <div className="flex">
                <div className="flex w-24 shrink-0 flex-col items-center justify-center bg-hoop py-5 text-white">
                  <span className="text-xs font-bold uppercase tracking-widest">{weekday(next.run_date, 'short')}</span>
                  <span className="font-display text-5xl font-black leading-none">{fromKey(next.run_date).getDate()}</span>
                  <span className="text-xs font-bold uppercase tracking-widest">{fromKey(next.run_date).toLocaleDateString('en-US', { month: 'short' })}</span>
                </div>
                <div className="flex-1 border-l-2 border-dashed border-court p-4">
                  <p className="label mb-0.5 text-hoop">Next run · {relativeDay(next.run_date)}</p>
                  <p className="font-display text-2xl font-extrabold uppercase leading-tight">{next.gym_name || 'Location TBD'}</p>
                  <p className="text-sm text-muted">{timeRange(next.start_time, next.end_time)} · ${Number(next.price)}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <button onClick={() => setJoining(next)} className="btn-primary py-2">Join</button>
                    <span className="text-xs font-semibold text-muted">
                      {next.going} in{next.capacity ? ` · ${Math.max(next.capacity - next.going, 0)} left` : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {welcome && (
          <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-good/30 bg-good/10 px-4 py-3 text-sm text-good">
            <span>{welcome}</span>
            <button onClick={() => setWelcome(null)}>×</button>
          </div>
        )}

        {/* Calendar + day panel */}
        <section className="card mt-10 grid gap-8 p-4 sm:p-6 lg:grid-cols-[1.1fr_1fr]">
          <Calendar year={ym.y} month={ym.m} runsByDate={runsByDate} selected={selected}
            onSelect={select} onMonth={(y, m) => setYm({ y, m })} />

          <div ref={panelRef} className="scroll-mt-4">
            <div className="mb-4 flex items-baseline justify-between border-b border-line pb-3">
              <h2 className="font-display text-3xl font-extrabold uppercase leading-none">
                {weekday(selected)} <span className="text-hoop">{selDate.getMonth() + 1}/{selDate.getDate()}</span>
              </h2>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                {selected === todayKey() ? 'Today · ' : ''}{dayRuns.length ? `${dayRuns.length} run${dayRuns.length > 1 ? 's' : ''}` : 'No runs'}
              </span>
            </div>

            <div className="space-y-3">
              {dayRuns.map(r => (
                <RunCard key={r.id} run={r} refreshKey={refreshKey} onJoin={() => setJoining(r)} onShare={() => setSharing(r)} />
              ))}
              {dayRuns.length === 0 && (
                <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center">
                  <p className="text-sm text-muted">No run this day.</p>
                  {nextAfterSelected && (
                    <button onClick={() => select(nextAfterSelected.run_date)} className="btn-ghost mt-3">
                      Next run: {shortDate(nextAfterSelected.run_date)} →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Membership */}
        {settings?.stripe_membership_url && (
          <section className="mt-8 overflow-hidden rounded-2xl border border-hoop-line bg-gradient-to-br from-hoop/20 via-surface to-surface p-6 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-8">
            <div>
              <p className="label text-hoop">Membership</p>
              <p className="font-display text-5xl font-black leading-none">
                ${Number(settings.member_price)}<span className="text-xl text-muted">/mo</span>
              </p>
              <p className="mt-2 text-sm text-fg/75">{settings.member_runs_per_month} runs a month. No paying each time. Cancel anytime.</p>
            </div>
            <div className="mt-5 flex flex-col items-start gap-2 sm:mt-0 sm:items-end">
              <a href={membershipLink(settings, me?.player_id)} target="_blank" rel="noopener noreferrer" className="btn-primary px-6 py-3 text-base">
                Become a member
              </a>
              {settings.stripe_portal_url && (
                <a href={settings.stripe_portal_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted underline underline-offset-2">
                  Manage or cancel
                </a>
              )}
            </div>
          </section>
        )}

        <footer className="mt-12 text-center font-display text-sm font-bold uppercase tracking-[0.2em] text-muted/60">
          CourtFlow Hoops · Runs · Invite only
        </footer>
      </main>

      {joining && (
        <JoinSheet run={joining} onClose={() => setJoining(null)} onJoined={() => setRefreshKey(k => k + 1)} />
      )}
      {sharing && <ShareSheet run={sharing} onClose={() => setSharing(null)} />}
    </div>
  )
}

function Ball() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#ff6a1a" />
      <path d="M1 12h22M12 1v22M4.2 4.2c3.5 3 3.5 12.6 0 15.6M19.8 4.2c-3.5 3-3.5 12.6 0 15.6" stroke="#0c0d10" strokeWidth="1.4" fill="none" />
    </svg>
  )
}

// Faint half-court lines behind the hero
function CourtLines() {
  return (
    <svg className="pointer-events-none absolute right-[-160px] top-[-80px] h-[620px] w-[620px] opacity-[0.07] sm:right-[-60px]" viewBox="0 0 600 600" aria-hidden="true">
      <g fill="none" stroke="#ff6a1a" strokeWidth="3">
        <circle cx="300" cy="300" r="90" />
        <circle cx="300" cy="300" r="250" />
        <path d="M0 300h600" />
        <rect x="210" y="300" width="180" height="300" />
      </g>
    </svg>
  )
}
