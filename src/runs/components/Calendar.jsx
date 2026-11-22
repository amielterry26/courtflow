import { monthGrid, toKey, todayKey } from '../lib/dates'

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function Calendar({ year, month, runsByDate, selected, onSelect, onMonth }) {
  const days = monthGrid(year, month)
  const today = todayKey()
  const monthName = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long' })

  function shift(delta) {
    const d = new Date(year, month + delta, 1)
    onMonth(d.getFullYear(), d.getMonth())
  }

  function goToday() {
    const d = new Date()
    onMonth(d.getFullYear(), d.getMonth())
    onSelect(today)
  }

  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-2">
        <h2 className="font-display text-3xl font-extrabold uppercase leading-none tracking-tight sm:text-4xl">
          {monthName} <span className="text-muted/60">{year}</span>
        </h2>
        <div className="flex items-center gap-1">
          <NavBtn onClick={() => shift(-1)} label="Previous month">‹</NavBtn>
          <button onClick={goToday} className="h-9 rounded-lg border border-line px-3 text-xs font-bold uppercase tracking-wider text-muted hover:text-fg">
            Today
          </button>
          <NavBtn onClick={() => shift(1)} label="Next month">›</NavBtn>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {DOW.map((d, i) => (
          <div key={i} className="pb-1 text-center text-[11px] font-bold text-muted/70">{d}</div>
        ))}
        {days.map(d => {
          const key = toKey(d)
          const runs = runsByDate[key] ?? []
          const live = runs.some(r => !r.cancelled)
          const inMonth = d.getMonth() === month
          const isSel = key === selected
          const isToday = key === today
          const hasRun = runs.length > 0

          let cls = 'border-transparent text-fg/70 hover:bg-raised'
          if (isSel) cls = 'border-hoop bg-hoop text-white shadow-[0_0_24px_-4px_#ff6a1a]'
          else if (hasRun && live) cls = 'border-hoop-line bg-hoop-soft text-fg hover:bg-hoop/20'
          else if (hasRun) cls = 'border-line bg-raised text-muted line-through'

          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={`relative flex aspect-square items-center justify-center rounded-lg border font-display text-lg font-bold transition sm:text-xl
                ${cls} ${inMonth ? '' : 'opacity-30'}`}
            >
              {d.getDate()}
              {isToday && !isSel && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-fg" />}
              {hasRun && live && !isSel && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-hoop" />}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex items-center gap-4 text-[11px] font-medium text-muted">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-hoop-line bg-hoop-soft" /> Run day</span>
        <span className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-fg" /> Today</span>
      </div>
    </div>
  )
}

function NavBtn({ onClick, label, children }) {
  return (
    <button onClick={onClick} aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-xl leading-none text-muted hover:text-fg">
      {children}
    </button>
  )
}
