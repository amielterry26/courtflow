import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { shortDate } from '../../lib/dates'
import { formatPhone, smsLink } from '../../lib/pay'

export default function AdminRequests({ onChange }) {
  const [requests, setRequests] = useState([])
  const [approved, setApproved] = useState([])

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('run_players')
      .select('*, run_signups(id, runs(run_date))')
      .eq('status', 'pending').order('created_at')
    setRequests(data ?? [])
    onChange(data?.length ?? 0)
  }

  async function approve(p) {
    await supabase.from('run_players').update({ status: 'approved' }).eq('id', p.id)
    setApproved(a => [...a, p])
    load()
  }

  async function deny(p) {
    if (!confirm(`Deny ${p.first_name}'s request?`)) return
    await supabase.from('run_signups').delete().eq('player_id', p.id)
    await supabase.from('run_players').update({ status: 'denied' }).eq('id', p.id)
    load()
  }

  return (
    <div className="space-y-3">
      {approved.map(p => (
        <div key={p.id} className="flex items-center justify-between gap-3 rounded-2xl border border-green-200 bg-green-50 p-3 text-sm text-green-900">
          <span>Approved {p.first_name}. Let them know:</span>
          <a href={smsLink(p.phone, `You're approved for the runs! Pick a date and pay here: ${window.location.origin}`)}
            className="btn shrink-0 bg-green-700 py-1.5 text-white">💬 Text</a>
        </div>
      ))}

      {requests.length === 0 && <div className="card p-8 text-center text-sm text-stone-500">No pending requests.</div>}

      {requests.map(p => (
        <div key={p.id} className="card p-4">
          <p className="font-semibold">{p.first_name} {p.last_name}</p>
          <a href={`sms:+1${p.phone}`} className="text-sm text-stone-500">{formatPhone(p.phone)}</a>
          {p.run_signups.length > 0 && (
            <p className="mt-1 text-sm text-stone-600">
              Wants: {p.run_signups.map(s => shortDate(s.runs.run_date)).join(', ')}
            </p>
          )}
          <p className="mt-1 text-xs text-stone-400">Requested {new Date(p.created_at).toLocaleDateString()}</p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => approve(p)} className="btn-primary flex-1">Approve</button>
            <button onClick={() => deny(p)} className="btn-ghost flex-1">Deny</button>
          </div>
        </div>
      ))}
    </div>
  )
}
