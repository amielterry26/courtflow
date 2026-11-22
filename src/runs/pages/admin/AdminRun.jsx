import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { shortDate, timeRange } from '../../lib/dates'
import { METHOD_LABELS, groupSmsLink, formatPhone } from '../../lib/pay'
import RunForm from './RunForm'

export default function AdminRun() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [run, setRun] = useState(null)
  const [players, setPlayers] = useState([])
  const [editing, setEditing] = useState(false)
  const [unpaidOnly, setUnpaidOnly] = useState(false)
  const [addId, setAddId] = useState('')
  const [reminding, setReminding] = useState('')

  useEffect(() => { load() }, [id])

  async function load() {
    const { data } = await supabase.from('runs')
      .select('*, gyms(name), run_signups(id, paid, payment_method, created_at, run_players(id, first_name, last_name, phone, status, is_member))')
      .eq('id', id).single()
    setRun(data)
    const { data: all } = await supabase.from('run_players').select('id, first_name, last_name')
      .eq('status', 'approved').eq('division', data?.division ?? 'adult').order('first_name')
    setPlayers(all ?? [])
  }

  async function togglePaid(signup) {
    setRun(r => ({ ...r, run_signups: r.run_signups.map(s => s.id === signup.id ? { ...s, paid: !s.paid } : s) }))
    await supabase.from('run_signups').update({ paid: !signup.paid }).eq('id', signup.id)
  }

  async function setMethod(signup, method) {
    setRun(r => ({ ...r, run_signups: r.run_signups.map(s => s.id === signup.id ? { ...s, payment_method: method || null } : s) }))
    await supabase.from('run_signups').update({ payment_method: method || null }).eq('id', signup.id)
  }

  async function remove(signup) {
    if (!confirm(`Remove ${signup.run_players.first_name} from this run?`)) return
    await supabase.from('run_signups').delete().eq('id', signup.id)
    load()
  }

  async function addPlayer() {
    if (!addId) return
    await supabase.from('run_signups').insert({ run_id: id, player_id: addId, payment_method: 'cash' })
    setAddId('')
    load()
  }

  async function textReminder() {
    if (!confirm('Text a reminder to everyone on this run?')) return
    setReminding('Sending…')
    const { data, error } = await supabase.functions.invoke('runs-sms', { body: { action: 'remind_run', run_id: id } })
    if (error) return setReminding(error.message)
    setReminding(`Sent ${data.sent}${data.failed?.length ? ` · couldn't text ${data.failed.length}: ${data.failed.join('; ')}` : ''}`)
  }

  async function toggleCancelled() {
    if (!confirm(run.cancelled ? 'Reopen this run?' : 'Cancel this run? It stays on the calendar marked cancelled.')) return
    await supabase.from('runs').update({ cancelled: !run.cancelled }).eq('id', id)
    load()
  }

  async function deleteRun() {
    if (!confirm('Delete this run and its roster for good?')) return
    await supabase.from('runs').delete().eq('id', id)
    navigate('/admin')
  }

  if (!run) return <p className="text-sm text-muted">Loading…</p>

  const signups = [...run.run_signups].sort((a, b) => a.created_at.localeCompare(b.created_at))
  const paidCount = signups.filter(s => s.paid).length
  const shown = unpaidOnly ? signups.filter(s => !s.paid) : signups
  const onRun = new Set(signups.map(s => s.run_players.id))
  const unpaidPhones = signups.filter(s => !s.paid).map(s => s.run_players.phone)

  return (
    <div>
      <button onClick={() => navigate('/admin')} className="mb-3 text-sm text-muted">← Runs</button>

      {editing ? (
        <RunForm run={run} onDone={() => { setEditing(false); load() }} />
      ) : (
        <div className="card mb-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-extrabold uppercase">{shortDate(run.run_date)}</h1>
              <p className="text-sm text-muted">{timeRange(run.start_time, run.end_time)} · {run.gyms?.name ?? 'No location'} · ${Number(run.price)}</p>
              {run.notes && <p className="mt-1 text-sm text-muted">{run.notes}</p>}
              {run.cancelled && <p className="mt-1 text-sm font-medium text-bad">Cancelled</p>}
            </div>
            <button onClick={() => setEditing(true)} className="btn-ghost py-1.5 text-xs">Edit</button>
          </div>
          <div className="mt-4 grid grid-cols-3 divide-x divide-line rounded-2xl bg-raised text-center">
            <Mini value={`${signups.length}${run.capacity ? `/${run.capacity}` : ''}`} label="Going" />
            <Mini value={paidCount} label="Paid" />
            <Mini value={`$${paidCount * Number(run.price)}`} label="Collected" />
          </div>
        </div>
      )}

      <div className="mb-2 flex items-center justify-between">
        <h2 className="label mb-0">Roster</h2>
        <label className="flex items-center gap-2 text-sm text-fg/75">
          <input type="checkbox" checked={unpaidOnly} onChange={e => setUnpaidOnly(e.target.checked)} className="accent-hoop" />
          Unpaid only
        </label>
      </div>

      <div className="card divide-y divide-line">
        {shown.length === 0 && <p className="p-6 text-center text-sm text-muted">{unpaidOnly ? 'Everyone has paid 🎉' : 'Nobody yet.'}</p>}
        {shown.map(s => {
          const p = s.run_players
          return (
            <div key={s.id} className="flex items-center gap-3 p-3">
              <button onClick={() => togglePaid(s)} aria-label={s.paid ? 'Mark unpaid' : 'Mark paid'}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 text-sm font-bold transition
                  ${s.paid ? 'border-green-600 bg-green-600 text-white' : 'border-line bg-surface text-transparent'}`}>
                ✓
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {p.first_name} {p.last_name}
                  {p.is_member && <span className="ml-1.5 text-xs text-hoop">⭐</span>}
                  {p.status === 'pending' && <span className="ml-1.5 rounded bg-warn/15 px-1.5 text-xs text-warn">Request</span>}
                </p>
                <a href={`sms:+1${p.phone}`} className="text-xs text-muted">{formatPhone(p.phone)}</a>
              </div>
              <select value={s.payment_method ?? ''} onChange={e => setMethod(s, e.target.value)}
                className="rounded-lg border border-line bg-surface px-2 py-1 text-xs">
                <option value="">—</option>
                {Object.entries(METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button onClick={() => remove(s)} aria-label="Remove" className="px-1 text-lg leading-none text-muted/50 hover:text-red-500">×</button>
            </div>
          )
        })}
      </div>

      <div className="mt-3 flex gap-2">
        <select value={addId} onChange={e => setAddId(e.target.value)} className="input flex-1 py-2 text-sm">
          <option value="">Add a player…</option>
          {players.filter(p => !onRun.has(p.id)).map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
        </select>
        <button onClick={addPlayer} disabled={!addId} className="btn-primary py-2">Add</button>
      </div>

      {unpaidPhones.length > 0 && (
        <a href={groupSmsLink(unpaidPhones, `Reminder: ${shortDate(run.run_date)} run is $${Number(run.price)}. Pay here: ${window.location.origin}`)}
          className="btn-ghost mt-3 w-full">💬 Text unpaid players ({unpaidPhones.length})</a>
      )}

      {signups.length > 0 && (
        <>
          <button onClick={textReminder} className="btn-ghost mt-2 w-full">📲 Text reminder to roster</button>
          <p className="mt-1 text-center text-xs text-muted">
            {reminding || 'Reminders go out automatically the evening before.'}
          </p>
        </>
      )}

      <div className="mt-8 flex gap-2">
        <button onClick={toggleCancelled} className="btn-ghost flex-1 text-sm">{run.cancelled ? 'Reopen run' : 'Cancel run'}</button>
        <button onClick={deleteRun} className="btn flex-1 border border-bad/30 text-sm text-bad hover:bg-bad/10">Delete</button>
      </div>
    </div>
  )
}

function Mini({ value, label }) {
  return (
    <div className="py-3">
      <p className="font-display text-xl font-extrabold uppercase">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">{label}</p>
    </div>
  )
}

