import { monthGrid, toKey, todayKey } from '../lib/dates'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function Calendar({ year, month, runsByDate, selected, onSelect, onMonth }) {
  const days = monthGrid(year, month)
  const today = todayKey()
  const title = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

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
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-serif text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h2>
        <div className="flex items-center gap-1.5">
          <NavBtn onClick={() => shift(-1)} label="Previous month">‹</NavBtn>
          <button onClick={goToday} className="h-9 rounded-full border border-sand-line bg-white px-3.5 text-sm font-medium hover:bg-sand">
            Today
          </button>
          <NavBtn onClick={() => shift(1)} label="Next month">›</NavBtn>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {DOW.map(d => (
          <div key={d} className="pb-1 text-center text-[10px] font-semibold uppercase tracking-widest text-stone-500 sm:text-[11px]">
            {d}
          </div>
        ))}
        {days.map(d => {
          const key = toKey(d)
          const runs = runsByDate[key] ?? []
          const live = runs.filter(r => !r.cancelled)
          const inMonth = d.getMonth() === month
          const isSel = key === selected
          const isToday = key === today
          const hasRun = runs.length > 0

          let cls = 'text-ink'
          if (isSel) cls = 'bg-ember text-white shadow-lg shadow-ember/30 border-ember'
          else if (hasRun) cls = 'bg-sand border-sand-line hover:bg-[#ebe1d4] text-ink'
          else cls = 'border-transparent text-stone-700 hover:bg-sand/60'

          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-xl border text-sm font-semibold transition sm:rounded-2xl sm:text-base
                ${cls} ${inMonth ? '' : 'opacity-35'} ${isToday && !isSel ? 'ring-2 ring-ember-line ring-offset-1 ring-offset-cream' : ''}`}
            >
              <span>{d.getDate()}</span>
              {hasRun && (
                <span className="mt-1 flex gap-0.5">
                  {(live.length ? live : runs).map(r => (
                    <span key={r.id}
                      className={`h-1.5 w-1.5 rounded-full ${isSel ? 'bg-white' : r.cancelled ? 'bg-stone-300' : 'bg-ember'}`} />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-stone-500">
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-ember" /> run day</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full ring-2 ring-ember-line" /> today</span>
      </div>
    </div>
  )
}

function NavBtn({ onClick, label, children }) {
  return (
    <button onClick={onClick} aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-sand-line bg-white text-lg leading-none hover:bg-sand">
      {children}
    </button>
  )
}
