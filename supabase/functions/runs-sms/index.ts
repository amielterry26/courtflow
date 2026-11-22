// Texts players.
//   { action: 'approved', player_id }  — trainer approved a request → text the player their link
//   { action: 'remind_run', run_id }   — trainer taps "Text reminder" on a run
//   { action: 'reminders' }            — nightly cron: remind everyone on tomorrow's runs (once each)
import { createClient } from 'npm:@supabase/supabase-js@2'
import { divisionUrl, pacificHour, pacificToday, runLink, sendSms, shortDate, timeRange } from '../_shared/sms.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

async function isTrainer(req: Request) {
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  const { data: { user } } = await db.auth.getUser(token)
  return !!user
}

const RUN_FIELDS = 'id, run_date, start_time, end_time, cancelled, division, gyms(name, address)'
const SIGNUP_FIELDS = `id, paid, payment_method, reminded_at, run_players!inner(first_name, phone, status, sms_opt_in), runs!inner(${RUN_FIELDS})`

function reminderText(s: any) {
  const run = s.runs
  const where = [run.gyms?.name, run.gyms?.address].filter(Boolean).join('\n')
  const maps = run.gyms?.address ? `https://maps.google.com/?q=${encodeURIComponent(run.gyms.address)}` : null
  const status = s.payment_method === 'member' ? 'Unlimited member ✅' : s.paid ? "You're paid ✅" : null
  return [
    `🏀 ${s.run_players.first_name}, you're on for the CourtFlow Hoops ${run.division === 'youth' ? 'youth run' : 'run'} tomorrow, ${shortDate(run.run_date)} · ${timeRange(run.start_time, run.end_time)}`,
    where,
    maps && `Directions: ${maps}`,
    status,
    'See you on the court!',
  ].filter(Boolean).join('\n')
}

async function remind(signups: any[]) {
  let sent = 0
  const failed: string[] = []
  for (const s of signups) {
    if (s.runs.cancelled || s.run_players.status !== 'approved' || !s.run_players.sms_opt_in) continue
    const r = await sendSms(s.run_players.phone, reminderText(s))
    if (r.ok) {
      sent++
      await db.from('run_signups').update({ reminded_at: new Date().toISOString() }).eq('id', s.id)
    } else failed.push(`${s.run_players.first_name}: ${r.error}`)
  }
  return { sent, failed }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const { action, player_id, run_id } = await req.json().catch(() => ({}))

  if (action === 'approved') {
    if (!(await isTrainer(req))) return json({ error: 'Not signed in' }, 401)
    const { data: p } = await db.from('run_players')
      .select('first_name, phone, status, division, sms_opt_in, run_signups(runs(id, run_date, division))').eq('id', player_id).single()
    if (!p || p.status !== 'approved') return json({ error: 'Player not approved' }, 400)
    if (!p.sms_opt_in) return json({ sent: 0, error: "they didn't opt in to texts" })
    const run = (p.run_signups ?? []).map((s: any) => s.runs).filter((r: any) => r.run_date >= pacificToday())
      .sort((a: any, b: any) => a.run_date.localeCompare(b.run_date))[0]
    const body = run
      ? `You're approved for CourtFlow Hoops runs, ${p.first_name} 🏀 Tap to lock in your spot for ${shortDate(run.run_date)}: ${runLink(run, true)}\nReply STOP to opt out.`
      : `You're approved for CourtFlow Hoops runs, ${p.first_name} 🏀 Pick a date and grab your spot: ${divisionUrl(p.division)}\nReply STOP to opt out.`
    const r = await sendSms(p.phone, body)
    return json({ sent: r.ok ? 1 : 0, error: r.error })
  }

  if (action === 'remind_run') {
    if (!(await isTrainer(req))) return json({ error: 'Not signed in' }, 401)
    const { data, error } = await db.from('run_signups').select(SIGNUP_FIELDS).eq('run_id', run_id)
    if (error) return json({ error: error.message }, 500)
    return json(await remind(data ?? []))
  }

  if (action === 'reminders') {
    // Cron runs this in the evening; outside that window it does nothing, and each person only gets one
    const hour = pacificHour()
    if (hour < 16 || hour > 21) return json({ sent: 0, skipped: 'outside reminder window' })
    const tomorrow = new Date(`${pacificToday()}T12:00:00Z`)
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    const { data, error } = await db.from('run_signups').select(SIGNUP_FIELDS)
      .eq('runs.run_date', tomorrow.toISOString().slice(0, 10)).is('reminded_at', null)
    if (error) return json({ error: error.message }, 500)
    return json({ ...(await remind(data ?? [])), found: data?.length ?? 0 })
  }

  return json({ error: 'Unknown action' }, 400)
})
