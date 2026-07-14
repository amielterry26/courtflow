import { Link, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTheme } from '../context/ThemeContext'

const nav = [
  { to: '/', label: 'Today' },
  { to: '/drills', label: 'Drills' },
  { to: '/sessions', label: 'Sessions' },
  { to: '/athletes', label: 'Athletes' },
  { to: '/intake', label: 'Intake' },
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
      {/* Top nav */}
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

      {/* Main content */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
        {children}
      </main>

      {/* Bottom tab bar (mobile nav) */}
      <nav className="sticky bottom-0 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex">
        {nav.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-zinc-400 dark:text-zinc-500'
              }`
            }
          >
            <span className="text-base mb-0.5">{navIcon(to)}</span>
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function navIcon(to) {
  switch (to) {
    case '/': return '📅'
    case '/athletes': return '👤'
    case '/drills': return '🏀'
    case '/sessions': return '📋'
    case '/intake': return '📝'
    default: return '•'
  }
}
