import { Link } from 'react-router-dom'
import { DIVISIONS, DIVISION_LABELS, basePath } from '../lib/division'
import ThemeToggle from './ThemeToggle'

// Sticky top bar for the public pages: brand, theme toggle, admin, and Adult / Youth tabs
export default function SiteHeader({ division, page = '' }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-court/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to={`${basePath(division)}/`} className="flex items-center gap-2">
          <Ball />
          <span className="font-display text-xl font-extrabold uppercase tracking-wide">CourtFlow Hoops</span>
          <span className="rounded bg-hoop px-1.5 py-0.5 font-display text-xs font-extrabold uppercase tracking-wider text-white">Runs</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/admin" className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:text-fg">Admin</Link>
        </div>
      </div>
      <nav className="mx-auto flex max-w-6xl px-4 pb-2.5">
        <div className="flex w-full rounded-xl border border-line bg-raised p-1 sm:w-auto">
          {DIVISIONS.map(d => (
            <Link key={d} to={`${basePath(d)}/${page}`}
              className={`flex-1 rounded-lg px-4 py-1.5 text-center text-sm font-bold uppercase tracking-wide transition sm:flex-none
                ${d === division ? 'bg-hoop text-white' : 'text-muted hover:text-fg'}`}>
              {DIVISION_LABELS[d]}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  )
}

function Ball() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="rgb(var(--hoop))" />
      <path d="M1 12h22M12 1v22M4.2 4.2c3.5 3 3.5 12.6 0 15.6M19.8 4.2c-3.5 3-3.5 12.6 0 15.6" stroke="#0c0d10" strokeWidth="1.4" fill="none" />
    </svg>
  )
}
