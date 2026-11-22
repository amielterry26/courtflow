import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatPhone } from '../../lib/pay'
import CopyButton from '../../components/CopyButton'
import { useAdminDivision } from '../../lib/adminDivision'
import { DIVISION_LABELS } from '../../lib/division'

const BLANK = { first_name: '', last_name: '', phone: '' }

export default function AdminPlayers() {
  const [players, setPlayers] = useState([])
  const [invites, setInvites] = useState([])
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(BLANK)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [inviteLabel, setInviteLabel] = useState('')
  const division = useAdminDivision()

  useEffect(() => { load() }, [division])

  async function load() {
    const [{ data: p }, { data: i }] = await Promise.all([
      supabase.from('run_players').select('*, run_signups(id)').eq('division', division).neq('status', 'pending').order('first_name'),
      supabase.from('run_invites').select('*').eq('division', division).order('created_at', { ascending: false }),
    ])
    setPlayers(p ?? [])
    setInvites(i ?? [])
  }

  async function addPlayer(e) {
    e.preventDefault()
    setError('')
    const phone = form.phone.replace(/\D/g, '').slice(-10)
    if (phone.length !== 10) return setError('Phone needs 10 digits')
    const { error } = await supabase.from('run_players').insert({ ...form, phone, status: 'approved', division })
    if (error) return setError(error.code === '23505' ? 'That phone number is already on the list' : error.message)
    setForm(BLANK)
    setAdding(false)
    load()
  }

  async function update(p, changes) {
    setPlayers(list => list.map(x => x.id === p.id ? { ...x, ...changes } : x))
    await supabase.from('run_players').update(changes).eq('id', p.id)
  }

  async function removePlayer(p) {
    if (!confirm(`Delete ${p.first_name} ${p.last_name}? Their run history goes too.`)) return
    await supabase.from('run_players').delete().eq('id', p.id)
    load()
  }

  async function createInvite() {
    await supabase.from('run_invites').insert({ label: inviteLabel || null, division })
    setInviteLabel('')
    load()
  }

  async function deleteInvite(token) {
    if (!confirm('Turn off this invite link?')) return
    await supabase.from('run_invites').delete().eq('token', token)
    load()
  }

  async function shareInvite(url) {
    if (navigator.share) {
      try { await navigator.share({ title: 'Join the runs', text: "You're invited to the pickup runs:", url }) } catch { /* dismissed */ }
    }
  }

  const q = search.toLowerCase()
  const shown = players.filter(p => `${p.first_name} ${p.last_name} ${p.phone}`.toLowerCase().includes(q))

  return (
    <div className="space-y-8">
      {/* Invite links */}
      <section>
        <h2 className="label">{DIVISION_LABELS[division]} invite links</h2>
        <p className="mb-3 text-sm text-muted">Anyone who signs up through an invite link is approved right away.</p>
        <div className="mb-3 flex gap-2">
          <input className="input flex-1 py-2 text-sm" placeholder="Who's it for? (optional)" value={inviteLabel}
            onChange={e => setInviteLabel(e.target.value)} />
          <button onClick={createInvite} className="btn-primary py-2">+ Link</button>
        </div>
        <div className="space-y-2">
          {invites.map(i => {
            const url = `${window.location.origin}/invite/${i.token}`
            return (
              <div key={i.token} className="card space-y-2 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{i.label || 'General invite'}</span>
                  <div className="flex gap-3 text-xs">
                    {typeof navigator !== 'undefined' && navigator.share && (
                      <button onClick={() => shareInvite(url)} className="font-medium text-hoop">Share</button>
                    )}
                    <button onClick={() => deleteInvite(i.token)} className="text-muted/80 hover:text-red-500">Turn off</button>
                  </div>
                </div>
                <CopyButton value={url} label={url.replace(/^https?:\/\//, '')} />
              </div>
            )
          })}
        </div>
      </section>

      {/* Players */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="label mb-0">Players · {players.filter(p => p.status === 'approved').length}</h2>
          {!adding && <button onClick={() => setAdding(true)} className="btn-ghost py-1.5 text-sm">+ Add player</button>}
        </div>

        {adding && (
          <form onSubmit={addPlayer} className="card mb-3 space-y-3 p-4">
            <div className="grid grid-cols-2 gap-3">
              <input required className="input" placeholder="First name" value={form.first_name}
                onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
              <input required className="input" placeholder="Last name" value={form.last_name}
                onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
            </div>
            <input required type="tel" inputMode="tel" className="input" placeholder="Phone" value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            {error && <p className="text-sm text-bad">{error}</p>}
            <div className="flex gap-2">
              <button className="btn-primary flex-1">Add player</button>
              <button type="button" onClick={() => { setAdding(false); setError('') }} className="btn-ghost px-5">Cancel</button>
            </div>
          </form>
        )}

        <input className="input mb-3 py-2 text-sm" placeholder="Search players" value={search} onChange={e => setSearch(e.target.value)} />

        <div className="card divide-y divide-line">
          {shown.length === 0 && <p className="p-6 text-center text-sm text-muted">No players yet.</p>}
          {shown.map(p => (
            <div key={p.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className={`truncate font-medium ${p.status === 'denied' ? 'text-muted/80 line-through' : ''}`}>
                  {p.first_name} {p.last_name}
                </p>
                <p className="text-xs text-muted">
                  <a href={`sms:+1${p.phone}`}>{formatPhone(p.phone)}</a> · {p.run_signups.length} run{p.run_signups.length === 1 ? '' : 's'}
                </p>
              </div>
              {p.status === 'denied' ? (
                <button onClick={() => update(p, { status: 'approved' })} className="text-xs font-medium text-hoop">Approve</button>
              ) : (
                <button onClick={() => update(p, { is_member: !p.is_member })}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium ${p.is_member ? 'border-hoop bg-hoop-soft text-hoop-dark' : 'border-line text-muted'}`}>
                  {p.is_member ? '♾ Unlimited' : 'Unlimited?'}
                </button>
              )}
              <button onClick={() => removePlayer(p)} aria-label="Delete" className="px-1 text-lg leading-none text-muted/50 hover:text-red-500">×</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
