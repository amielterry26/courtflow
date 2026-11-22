import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getMe } from '../lib/me'
import { fromKey, monthGrid, toKey, todayKey, relativeDay, shortDate, weekday } from '../lib/dates'
import { membershipLink, STRIPE_MEMBERSHIP_URL, STRIPE_PORTAL_URL } from '../lib/pay'
import Calendar from '../components/Calendar'
import RunCard from '../components/RunCard'
import JoinSheet from '../components/JoinSheet'

export default function Home() {
  const location = useLocation()
  const now = new Date()
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [runs, setRuns] = useState([])
  const [upcoming, setUpcoming] = useState([])
  const [selected, setSelected] = useState(todayKey())
  const [joining, setJoining] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [welcome, setWelcome] = useState(location.state?.welcome ?? null)
  const panelRef = useRef(null)

  // Runs for the visible 6-week grid
  useEffect(() => {
    const grid = monthGrid(ym.y, ym.m)
    supabase.rpc('runs_calendar', { p_from: toKey(grid[0]), p_to: toKey(grid[41]) })
      .then(({ data }) => setRuns(data ?? []))
  }, [ym, refreshKey])

  // Next few runs for the hero, regardless of month
  useEffect(() => {
    const until = new Date()
    until.setDate(until.getDate() + 120)
    supabase.rpc('runs_calendar', { p_from: todayKey(), p_to: toKey(until) }).then(({ data }) => {
      const list = (data ?? []).filter(r => !r.cancelled)
      setUpcoming(list)
      // First load: jump to the next run
      if (list[0] && refreshKey === 0) {
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

  function select(key) {
    setSelected(key)
    const d = fromKey(key)
    if (d.getMonth() !== ym.m) setYm({ y: d.getFullYear(), m: d.getMonth() })
    // On phones the panel sits under the calendar — bring it into view
    if (window.innerWidth < 1024) setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const me = getMe()
  const selDate = fromKey(selected)

  return (
    <div className="min-h-screen bg-cream">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_15%_0%,rgba(234,138,72,0.22),transparent_55%),radial-gradient(ellipse_at_85%_0%,rgba(246,200,165,0.45),transparent_55%)]" />

      <header className="relative border-b border-sand-line/70 bg-cream/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="w-16" />
          <span className="flex items-center gap-1.5 font-serif text-[17px] font-semibold">
            <span className="text-ember">●</span> runs.courtflow
          </span>
          <button onClick={() => select(todayKey())} className="w-16 text-right text-sm text-stone-600">Today</button>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 pb-16">
        {/* Hero */}
        <section className="pt-10 text-center sm:pt-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-stone-500">Mason &amp; Terry Training · Invite only</p>
          <h1 className="mt-3 font-serif text-5xl font-bold leading-[0.95] tracking-tight sm:text-7xl">
            Open Gym<br /><span className="italic text-ember">Pickup Runs</span>
          </h1>
          <p className="mt-4 text-[15px] text-stone-600 sm:text-base">Tap a date to see the run, grab your spot, and pay.</p>

          {next && (
            <button onClick={() => select(next.run_date)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-ember-line bg-ember-soft px-3 py-1 text-xs font-medium text-ember-dark">
              <span className="h-1.5 w-1.5 rounded-full bg-ember" />
              Next run: {shortDate(next.run_date)}{next.gym_name ? ` · ${next.gym_name}` : ''}
            </button>
          )}

          <div className="mx-auto mt-6 grid max-w-md grid-cols-3 divide-x divide-sand-line overflow-hidden rounded-3xl border border-sand-line bg-white/80 shadow-[0_8px_30px_-12px_rgba(120,60,20,0.18)]">
            <Stat icon="→" value={next ? relativeDay(next.run_date) : '—'} label="Next run" small={next && relativeDay(next.run_date).length > 5} />
            <Stat icon="●" value={next ? next.going : 0} label="Going" />
            {next?.capacity
              ? <Stat icon="◎" value={Math.max(next.capacity - next.going, 0)} label="Spots left" />
              : <Stat icon="$" value={next ? `$${Number(next.price)}` : '—'} label="Per run" />}
          </div>
        </section>

        {welcome && (
          <div className="mx-auto mt-6 flex max-w-md items-center justify-between gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            <span>{welcome}</span>
            <button onClick={() => setWelcome(null)} className="text-green-700">×</button>
          </div>
        )}

        <div className="mx-auto my-8 h-px max-w-5xl bg-sand-line" />

        {/* Calendar + day panel */}
        <section className="card mx-auto grid max-w-5xl gap-8 p-4 sm:p-6 lg:grid-cols-[1.15fr_1fr]">
          <Calendar year={ym.y} month={ym.m} runsByDate={runsByDate} selected={selected}
            onSelect={select} onMonth={(y, m) => setYm({ y, m })} />

          <div ref={panelRef} className="scroll-mt-4">
            <div className="mb-4 flex items-center justify-center gap-3">
              <div className="w-11 overflow-hidden rounded-lg border border-sand-line bg-white text-center shadow-sm">
                <div className="bg-ember py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                  {selDate.toLocaleDateString('en-US', { month: 'short' })}
                </div>
                <div className="py-0.5 text-lg font-bold leading-tight">{selDate.getDate()}</div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-2xl font-semibold">{weekday(selected)}</h2>
                  {selected === todayKey() && (
                    <span className="rounded-md border border-ember-line bg-ember-soft px-1.5 py-0.5 font-serif text-xs text-ember-dark">Today</span>
                  )}
                </div>
                <span className="text-xs text-stone-500">
                  {dayRuns.length ? `${dayRuns.length} run${dayRuns.length > 1 ? 's' : ''}` : 'No runs'}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {dayRuns.map(r => (
                <RunCard key={r.id} run={r} refreshKey={refreshKey} onJoin={() => setJoining(r)} />
              ))}
              {dayRuns.length === 0 && (
                <div className="rounded-3xl border border-dashed border-sand-line px-6 py-10 text-center">
                  <p className="text-sm text-stone-500">No run this day.</p>
                  {nextAfterSelected && (
                    <button onClick={() => select(nextAfterSelected.run_date)} className="mt-3 btn-ghost">
                      Next run: {shortDate(nextAfterSelected.run_date)} →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Membership */}
        {STRIPE_MEMBERSHIP_URL && (
          <section className="mx-auto mt-8 max-w-5xl overflow-hidden rounded-3xl bg-ink p-6 text-white sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-8">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-ember-line">Membership</p>
              <p className="mt-1 font-serif text-3xl font-semibold">$25<span className="text-lg text-stone-400">/month</span></p>
              <p className="mt-1 text-sm text-stone-300">2 runs a month. No signing in, no hassle. Cancel anytime.</p>
            </div>
            <div className="mt-5 flex flex-col items-start gap-2 sm:mt-0 sm:items-end">
              <a href={membershipLink(me?.player_id)} target="_blank" rel="noopener noreferrer" className="btn-primary px-6 py-3 text-base">
                Become a member
              </a>
              {STRIPE_PORTAL_URL && (
                <a href={STRIPE_PORTAL_URL} target="_blank" rel="noopener noreferrer" className="text-xs text-stone-400 underline underline-offset-2">
                  Manage or cancel
                </a>
              )}
            </div>
          </section>
        )}

        <footer className="mt-10 text-center text-xs text-stone-400">
          CourtFlow Runs · <Link to="/admin" className="underline underline-offset-2">Admin</Link>
        </footer>
      </main>

      {joining && (
        <JoinSheet run={joining} onClose={() => setJoining(null)} onJoined={() => setRefreshKey(k => k + 1)} />
      )}
    </div>
  )
}

function Stat({ icon, value, label, small }) {
  return (
    <div className="px-2 py-4">
      <div className="text-xs text-ember">{icon}</div>
      <div className={`mt-1 font-serif font-semibold leading-none ${small ? 'pt-1.5 text-lg sm:text-xl' : 'text-3xl'}`}>{value}</div>
      <div className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-stone-500">{label}</div>
    </div>
  )
}
