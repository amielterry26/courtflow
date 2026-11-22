import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatPhone } from '../../lib/pay'
import CopyButton from '../../components/CopyButton'
import { useAdminDivision } from '../../lib/adminDivision'
import { DIVISION_LABELS } from '../../lib/division'

const LEVEL_LABELS = { adult: 'Adult', hs: 'HS', ms: 'MS' }
const FILTERS = [['all', 'All'], ['shown', 'In dropdown'], ['hidden', 'Hidden'], ['unlimited', 'Unlimited']]

export default function AdminPlayers() {
  const division = useAdminDivision()
  const other = division === 'adult' ? 'youth' : 'adult'
  const [players, setPlayers] = useState([])
  const [invites, setInvites] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [adding, setAdding] = useState(false)
  const [inviteLabel, setInviteLabel] = useState('')

  useEffect(() => { load() }, [division])

  async function load() {
    const [{ data: p }, { data: i }] = await Promise.all([
      supabase.from('run_players').select('*, run_signups(id)').neq('status', 'pending').order('first_name'),
      supabase.from('run_invites').select('*').eq('division', division).order('created_at', { ascending: false }),
    ])
    setPlayers(p ?? [])
    setInvites(i ?? [])
  }

  async function update(p, changes) {
    setPlayers(list => list.map(x => x.id === p.id ? { ...x, ...changes } : x))
    await supabase.from('run_players').update(changes).eq('id', p.id)
  }

  async function removePlayer(p) {
    if (!confirm(`Delete ${p.first_name} ${p.last_name} from ${DIVISION_LABELS[division]}? Their run history goes too.`)) return
    await supabase.from('run_players').delete().eq('id', p.id)
    load()
  }

  // Copy a player into the other list (e.g. a kid who also plays adult runs)
  async function addToOther(p) {
    const level = other === 'adult' ? 'adult' : (prompt(`${p.first_name}'s school: type HS or MS`, 'HS') ?? '').trim().toLowerCase()
    if (!['adult', 'hs', 'ms'].includes(level)) return
    await supabase.from('run_players').insert({
      first_name: p.first_name, last_name: p.last_name, phone: p.phone, sms_opt_in: p.sms_opt_in,
      division: other, level, status: 'approved',
    })
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
    try { await navigator.share({ title: 'Join the runs', text: "You're invited to the CourtFlow Hoops runs:", url }) } catch { /* dismissed */ }
  }

  const mine = players.filter(p => p.division === division)
  const inOther = new Set(players.filter(p => p.division === other).map(p => `${p.first_name}|${p.last_name}`.toLowerCase()))
  const q = search.toLowerCase()
  const shown = mine
    .filter(p => `${p.first_name} ${p.last_name} ${p.phone ?? ''}`.toLowerCase().includes(q))
    .filter(p => filter === 'all' || (filter === 'shown' && p.show_in_list && p.status === 'approved')
      || (filter === 'hidden' && (!p.show_in_list || p.status !== 'approved')) || (filter === 'unlimited' && p.is_member))
  const visibleCount = mine.filter(p => p.show_in_list && p.status === 'approved').length

  return (
    <div className="space-y-8">
      {/* Players */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="label mb-0">{DIVISION_LABELS[division]} players · {mine.length}</h2>
            <p className="text-xs text-muted">{visibleCount} show up in the join dropdown</p>
          </div>
          {!adding && <button onClick={() => setAdding(true)} className="btn-primary shrink-0 py-2">+ Add player</button>}
        </div>

        {adding && <AddPlayer division={division} players={players} onDone={() => { setAdding(false); load() }} />}

        <input className="input mb-2 py-2 text-sm" placeholder="Search players" value={search} onChange={e => setSearch(e.target.value)} />
        <div className="mb-3 flex gap-1.5 overflow-x-auto">
          {FILTERS.map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${filter === key ? 'border-fg bg-fg text-court' : 'border-line text-muted'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="card divide-y divide-line">
          {shown.length === 0 && <p className="p-6 text-center text-sm text-muted">No players here yet.</p>}
          {shown.map(p => (
            <div key={p.id} className="space-y-2 p-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className={`truncate font-semibold ${p.status === 'denied' ? 'text-muted line-through' : ''}`}>
                    {p.first_name} {p.last_name}
                    {p.level && <span className="ml-2 rounded bg-raised px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted">{LEVEL_LABELS[p.level]}</span>}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {p.phone ? <a href={`sms:+1${p.phone}`}>{formatPhone(p.phone)}</a> : 'No phone'} · {p.run_signups.length} run{p.run_signups.length === 1 ? '' : 's'}
                    {p.stripe_customer_id && ' · Stripe'}
                  </p>
                </div>
                <button onClick={() => removePlayer(p)} aria-label="Delete" className="px-1 text-lg leading-none text-muted/50 hover:text-red-500">×</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {p.status === 'denied' ? (
                  <Chip on={false} onClick={() => update(p, { status: 'approved' })}>Approve</Chip>
                ) : (
                  <>
                    <Chip on={p.show_in_list} onClick={() => update(p, { show_in_list: !p.show_in_list })}>
                      {p.show_in_list ? '👁 In dropdown' : 'Hidden'}
                    </Chip>
                    <Chip on={p.is_member} onClick={() => update(p, { is_member: !p.is_member })}>
                      {p.is_member ? '♾ Unlimited' : 'Unlimited?'}
                    </Chip>
                    {division === 'youth' && (
                      <Chip on={false} onClick={() => update(p, { level: p.level === 'hs' ? 'ms' : 'hs' })}>
                        {p.level === 'ms' ? 'Middle school ⇄' : 'High school ⇄'}
                      </Chip>
                    )}
                    {!inOther.has(`${p.first_name}|${p.last_name}`.toLowerCase()) && (
                      <Chip on={false} onClick={() => addToOther(p)}>+ {DIVISION_LABELS[other]}</Chip>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Invite links */}
      <section>
        <h2 className="label">{DIVISION_LABELS[division]} invite links</h2>
        <p className="mb-3 text-sm text-muted">Anyone who signs up through an invite link is approved right away.</p>
        <div className="mb-3 flex gap-2">
          <input className="input flex-1 py-2 text-sm" placeholder="Who's it for? (optional)" value={inviteLabel}
            onChange={e => setInviteLabel(e.target.value)} />
          <button onClick={createInvite} className="btn-primary shrink-0 py-2">+ Link</button>
        </div>
        <div className="space-y-2">
          {invites.map(i => {
            const url = `${window.location.origin}/invite/${i.token}`
            return (
              <div key={i.token} className="card space-y-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{i.label || 'General invite'}</span>
                  <div className="flex shrink-0 gap-3 text-xs">
                    {navigator.share && <button onClick={() => shareInvite(url)} className="font-medium text-hoop">Share</button>}
                    <button onClick={() => deleteInvite(i.token)} className="text-muted hover:text-red-500">Turn off</button>
                  </div>
                </div>
                <CopyButton value={url} label={url.replace(/^https?:\/\//, '')} />
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function Chip({ on, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${on ? 'border-hoop bg-hoop-soft text-hoop' : 'border-line text-muted'}`}>
      {children}
    </button>
  )
}

// Add a player to Adult, Youth, or both. Admin can reuse a phone number (siblings sharing a parent's phone).
function AddPlayer({ division, players, onDone }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', sms_opt_in: true,
    adult: division === 'adult', youth: division === 'youth', level: 'hs',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    setError('')
    const phone = form.phone.replace(/\D/g, '').slice(-10)
    if (form.phone && phone.length !== 10) return setError('Phone needs 10 digits (or leave it blank)')
    if (!form.adult && !form.youth) return setError('Pick Adult, Youth, or both')
    const taken = phone && players.find(p => p.phone === phone)
    if (taken && !confirm(`${formatPhone(phone)} is already used by ${taken.first_name} ${taken.last_name}. Add anyway (e.g. siblings)?`)) return

    const base = { first_name: form.first_name.trim(), last_name: form.last_name.trim(), phone: phone || null, sms_opt_in: form.sms_opt_in, status: 'approved' }
    const rows = [
      form.adult && { ...base, division: 'adult', level: 'adult' },
      form.youth && { ...base, division: 'youth', level: form.level },
    ].filter(Boolean)
    setSaving(true)
    const { error } = await supabase.from('run_players').insert(rows)
    setSaving(false)
    if (error) return setError(error.message)
    onDone()
  }

  return (
    <form onSubmit={submit} className="card mb-3 space-y-3 p-4">
      <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
        <input required className="input" placeholder="First name" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
        <input required className="input" placeholder="Last name" value={form.last_name} onChange={e => set('last_name', e.target.value)} />
      </div>
      <input type="tel" inputMode="tel" className="input" placeholder="Phone (optional for kids)" value={form.phone} onChange={e => set('phone', e.target.value)} />

      <div>
        <p className="label">Plays in</p>
        <div className="flex gap-2">
          <Toggle on={form.adult} onClick={() => set('adult', !form.adult)}>Adult runs</Toggle>
          <Toggle on={form.youth} onClick={() => set('youth', !form.youth)}>Youth runs</Toggle>
        </div>
      </div>
      {form.youth && (
        <div>
          <p className="label">School</p>
          <div className="flex gap-2">
            <Toggle on={form.level === 'hs'} onClick={() => set('level', 'hs')}>High school</Toggle>
            <Toggle on={form.level === 'ms'} onClick={() => set('level', 'ms')}>Middle school</Toggle>
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-fg/80">
        <input type="checkbox" checked={form.sms_opt_in} onChange={e => set('sms_opt_in', e.target.checked)} className="accent-[rgb(var(--hoop))]" />
        They said OK to run texts (reminders)
      </label>
      {error && <p className="text-sm text-bad">{error}</p>}
      <div className="flex gap-2">
        <button disabled={saving} className="btn-primary flex-1">{saving ? 'Adding…' : 'Add player'}</button>
        <button type="button" onClick={onDone} className="btn-ghost px-5">Cancel</button>
      </div>
    </form>
  )
}

function Toggle({ on, onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold ${on ? 'border-hoop bg-hoop-soft text-hoop' : 'border-line bg-raised text-muted'}`}>
      {children}
    </button>
  )
}
