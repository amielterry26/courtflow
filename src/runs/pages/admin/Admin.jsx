import { useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import AdminRuns from './AdminRuns'
import AdminRun from './AdminRun'
import AdminRequests from './AdminRequests'
import AdminPlayers from './AdminPlayers'
import AdminLocations from './AdminLocations'
import AdminSettings from './AdminSettings'
import { setBadge } from '../../lib/push'
import { todayKey } from '../../lib/dates'
import ThemeToggle from '../../components/ThemeToggle'
import { AdminDivision } from '../../lib/adminDivision'
import { DIVISIONS, DIVISION_LABELS } from '../../lib/division'

const tabs = [
  { to: '/admin', label: 'Runs', end: true },
  { to: '/admin/requests', label: 'Requests' },
  { to: '/admin/players', label: 'Players' },
  { to: '/admin/locations', label: 'Locations' },
  { to: '/admin/settings', label: 'Settings' },
]

export default function Admin() {
  const [user, setUser] = useState(undefined)
  const [pending, setPending] = useState(0)
  const [unpaid, setUnpaid] = useState(0)
  const [division, setDivision] = useState(() => {
    try { return localStorage.getItem('runs-admin-division') || 'adult' } catch { return 'adult' }
  })

  function pickDivision(d) {
    setDivision(d)
    try { localStorage.setItem('runs-admin-division', d) } catch { /* ignore */ }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])

  // "Add to Home Screen" from admin opens straight into admin
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'manifest'
    link.href = '/runs-admin.webmanifest'
    document.head.appendChild(link)
    return () => link.remove()
  }, [])

  // Pending request count: tab badge + home screen icon badge, refreshed when the app comes back up
  useEffect(() => {
    if (!user) return
    const refresh = async () => {
      const today = todayKey()
      const [{ count: requests }, { count: payments }] = await Promise.all([
        supabase.from('run_players').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('run_signups').select('id, runs!inner(run_date)', { count: 'exact', head: true })
          .eq('paid', false).not('payment_method', 'is', null).gte('runs.run_date', today),
      ])
      setPending(requests ?? 0)
      setUnpaid(payments ?? 0)
    }
    refresh()
    const onVisible = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVisible)
    const timer = setInterval(refresh, 60_000)
    return () => { document.removeEventListener('visibilitychange', onVisible); clearInterval(timer) }
  }, [user])

  useEffect(() => { if (user) setBadge(pending + unpaid) }, [pending, unpaid, user])

  if (user === undefined) return <div className="min-h-screen bg-court" />
  if (!user) return <Login />

  return (
    <div className="min-h-screen bg-court">
      <header className="sticky top-0 z-40 border-b border-line bg-court/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex min-w-0 items-center gap-1.5 font-display text-[17px] font-extrabold uppercase">
            <span className="text-hoop">●</span> <span className="truncate">Runs admin</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button onClick={() => supabase.auth.signOut()} className="text-sm text-muted">Sign out</button>
          </div>
        </div>
        <div className="mx-auto flex max-w-2xl px-4 pb-2">
          <div className="flex w-full rounded-xl border border-line bg-raised p-1">
            {DIVISIONS.map(d => (
              <button key={d} onClick={() => pickDivision(d)}
                className={`flex-1 rounded-lg py-1.5 text-sm font-bold uppercase tracking-wide transition
                  ${d === division ? 'bg-fg text-court' : 'text-muted hover:text-fg'}`}>
                {DIVISION_LABELS[d]}
              </button>
            ))}
          </div>
        </div>
        <nav className="mx-auto flex max-w-2xl gap-1 overflow-x-auto px-4 pb-2">
          {tabs.map(t => (
            <NavLink key={t.to} to={t.to} end={t.end}
              className={({ isActive }) => `whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition
                ${isActive ? 'bg-hoop text-white' : 'text-fg/75 hover:bg-raised'}`}>
              {t.label}
              {t.label === 'Runs' && unpaid > 0 && (
                <span className="ml-1.5 rounded-full bg-white px-1.5 text-xs text-hoop ring-1 ring-hoop/30">{unpaid} 💵</span>
              )}
              {t.label === 'Requests' && pending > 0 && (
                <span className="ml-1.5 rounded-full bg-surface px-1.5 text-xs text-hoop">{pending}</span>
              )}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 pb-20">
        <AdminDivision.Provider value={division}>
          <Routes>
            <Route index element={<AdminRuns />} />
            <Route path="runs/:id" element={<AdminRun />} />
            <Route path="requests" element={<AdminRequests onChange={setPending} />} />
            <Route path="players" element={<AdminPlayers />} />
            <Route path="locations" element={<AdminLocations />} />
            <Route path="settings" element={<AdminSettings />} />
          </Routes>
        </AdminDivision.Provider>
      </main>
    </div>
  )
}

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-court px-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4 p-6">
        <h1 className="text-center font-display text-3xl font-extrabold uppercase">Runs <span className="text-hoop">admin</span></h1>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required className="input" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="pw">Password</label>
          <input id="pw" type="password" required className="input" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        {error && <p className="text-sm text-bad">{error}</p>}
        <button disabled={loading} className="btn-primary w-full py-3">{loading ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  )
}
