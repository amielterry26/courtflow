import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { shortDate, timeRange, todayKey } from '../../lib/dates'
import RunForm from './RunForm'

export default function AdminRuns() {
  const [runs, setRuns] = useState([])
  const [showPast, setShowPast] = useState(false)
  const [adding, setAdding] = useState(false)

  useEffect(() => { load() }, [showPast])

  async function load() {
    let q = supabase.from('runs').select('*, gyms(name), run_signups(paid)')
    q = showPast
      ? q.lt('run_date', todayKey()).order('run_date', { ascending: false }).limit(30)
      : q.gte('run_date', todayKey()).order('run_date').order('start_time')
    const { data } = await q
    setRuns(data ?? [])
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex rounded-full border border-line bg-surface p-0.5 text-sm">
          {[['Upcoming', false], ['Past', true]].map(([label, past]) => (
            <button key={label} onClick={() => setShowPast(past)}
              className={`rounded-full px-3 py-1 ${showPast === past ? 'bg-surface border border-hoop-line text-white' : 'text-fg/75'}`}>{label}</button>
          ))}
        </div>
        {!adding && <button onClick={() => setAdding(true)} className="btn-primary py-2">+ New run</button>}
      </div>

      {adding && <RunForm onDone={() => { setAdding(false); load() }} />}

      <div className="space-y-2.5">
        {runs.length === 0 && (
          <div className="card p-8 text-center text-sm text-muted">{showPast ? 'No past runs.' : 'No upcoming runs. Add one.'}</div>
        )}
        {runs.map(r => {
          const going = r.run_signups.length
          const paid = r.run_signups.filter(s => s.paid).length
          return (
            <Link key={r.id} to={`/admin/runs/${r.id}`} className="card flex items-center justify-between gap-3 p-4 hover:bg-line">
              <div className="min-w-0">
                <p className="font-semibold">
                  {shortDate(r.run_date)} {r.cancelled && <span className="ml-1 text-xs font-medium text-red-400">Cancelled</span>}
                </p>
                <p className="truncate text-sm text-muted">{timeRange(r.start_time, r.end_time)} · {r.gyms?.name ?? 'No location'}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold">{going}{r.capacity ? `/${r.capacity}` : ''} going</p>
                <p className={`text-xs ${paid < going ? 'text-hoop' : 'text-green-400'}`}>{paid} paid</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
