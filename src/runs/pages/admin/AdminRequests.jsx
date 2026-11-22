import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { shortDate, todayKey } from '../../lib/dates'
import { formatPhone, smsLink } from '../../lib/pay'
import { runUrl } from '../../lib/notify'
import PushSetup from '../../components/PushSetup'

// The "Approve" link in the request email lands here with ?approve=<player id>
export default function AdminRequests({ onChange }) {
  const [params] = useSearchParams()
  const highlight = params.get('approve')
  const [requests, setRequests] = useState([])
  const [approved, setApproved] = useState([])

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('run_players')
      .select('*, run_signups(id, runs(id, run_date))')
      .eq('status', 'pending').order('created_at')
    const list = data ?? []
    // Request from the email link goes first
    list.sort((a, b) => (b.id === highlight) - (a.id === highlight))
    setRequests(list)
    onChange(list.length)
    // Link already handled (approved earlier)? Show its text button again
    if (highlight && !list.some(p => p.id === highlight) && !approved.some(p => p.id === highlight)) {
      const { data: p } = await supabase.from('run_players').select('*, run_signups(id, runs(id, run_date))').eq('id', highlight).single()
      if (p?.status === 'approved') setApproved(a => [...a, p])
    }
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

  function approvalText(p) {
    const run = p.run_signups.map(s => s.runs).filter(r => r.run_date >= todayKey()).sort((a, b) => a.run_date.localeCompare(b.run_date))[0]
    return run
      ? `You're approved for CourtFlow Hoops runs 🏀 Tap to lock in your spot for ${shortDate(run.run_date)}: ${runUrl(run, true)}`
      : `You're approved for CourtFlow Hoops runs 🏀 Pick a date and grab your spot: ${window.location.origin}`
  }

  return (
    <div className="space-y-3">
      <PushSetup compact />
      {approved.map(p => (
        <div key={p.id} className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-300">
          <p className="font-semibold">✓ {p.first_name} {p.last_name} is approved</p>
          <p className="mt-0.5 text-green-300/80">Send them the link so they can join and pay:</p>
          <a href={smsLink(p.phone, approvalText(p))} className="btn mt-3 w-full bg-green-600 py-3 text-white">💬 Text {p.first_name}</a>
        </div>
      ))}

      {requests.length === 0 && approved.length === 0 && (
        <div className="card p-8 text-center text-sm text-muted">No pending requests.</div>
      )}

      {requests.map(p => (
        <div key={p.id} className={`card p-4 ${p.id === highlight ? 'border-hoop ring-1 ring-hoop' : ''}`}>
          <p className="font-semibold">{p.first_name} {p.last_name}</p>
          <a href={`sms:+1${p.phone}`} className="text-sm text-muted">{formatPhone(p.phone)}</a>
          {p.run_signups.length > 0 && (
            <p className="mt-1 text-sm text-fg/75">
              Wants: {p.run_signups.map(s => shortDate(s.runs.run_date)).join(', ')}
            </p>
          )}
          <p className="mt-1 text-xs text-muted/80">Requested {new Date(p.created_at).toLocaleDateString()}</p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => approve(p)} className="btn-primary flex-1 py-3">Approve</button>
            <button onClick={() => deny(p)} className="btn-ghost flex-1 py-3">Deny</button>
          </div>
        </div>
      ))}
    </div>
  )
}
