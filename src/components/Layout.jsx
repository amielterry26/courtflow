import { Link, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTheme } from '../context/ThemeContext'

const nav = [
  { to: '/', label: 'Today', icon: '📅' },
  { to: '/drills', label: 'Drills', icon: '🏀' },
  { to: '/sessions', label: 'Sessions', icon: '📋' },
  { to: '/athletes', label: 'Athletes', icon: '👤' },
  { to: '/intake', label: 'Intake', icon: '📝' },
]

export default function Layout({ children }) {
  const navigate = useNavigate()
  const { dark, toggle } = useTheme()

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-lg font-bold tracking-tight text-blue-600 dark:text-blue-400">
          CourtFlow
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Toggle theme"
          >
            {dark ? '☀️' : '🌙'}
          </button>
          <button
            onClick={signOut}
            className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 px-2 py-1"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main content — extra bottom padding for floating nav */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 pb-28">
        {children}
      </main>

      {/* Floating pill navigation */}
      <div className="fixed bottom-5 inset-x-0 flex justify-center z-50 pointer-events-none">
        <nav className="pointer-events-auto bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border border-zinc-200/80 dark:border-zinc-700/80 rounded-2xl shadow-lg shadow-black/10 dark:shadow-black/40 flex items-center px-2 py-1.5 gap-0.5">
          {nav.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`
              }
            >
              <span className="text-base mb-0.5">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
