// Pings the trainers (push to every subscribed phone + a text to RUNS_ADMIN_PHONE):
//   { player_id }     — someone just requested to join (public page)
//   { signup_token }  — someone picked how they're paying and needs confirming (public page)
//   { test: true }    — signed-in trainer checking notifications work
// Each request / payment only pings once, and only while it's fresh.
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { SITE_URL, sendSms, shortDate, timeRange } from '../_shared/sms.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const METHOD = { cash_app: 'Cash App', apple_cash: 'Apple Cash', zelle: 'Zelle', cash: 'cash at the run' } as Record<string, string>
const fmtPhone = (d: string | null) => (d ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : '')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const { player_id, signup_token, test } = await req.json().catch(() => ({}))
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const tenMinutesAgo = new Date(Date.now() - 10 * 60_000).toISOString()

  let payload: { title: string; body: string; url: string }
  let text: string | null = null

  if (test) {
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: { user } } = await db.auth.getUser(token)
    if (!user) return json({ error: 'Not signed in' }, 401)
    payload = { title: 'CourtFlow Runs', body: "Notifications are on 🏀 You'll get pinged for requests and payments.", url: '/admin/requests' }
  } else if (signup_token) {
    const { data: s } = await db.from('run_signups')
      .update({ payment_notified_at: new Date().toISOString() })
      .eq('token', signup_token).eq('paid', false).is('payment_notified_at', null)
      .not('payment_method', 'is', null).neq('payment_method', 'member')
      .select('run_id, payment_method, run_players(first_name, last_name), runs(run_date, start_time, end_time, price, division)')
      .maybeSingle()
    if (!s) return json({ sent: 0 })
    const p = s.run_players as any, run = s.runs as any
    const who = `${p.first_name} ${p.last_name}`
    const what = `$${Number(run.price)} via ${METHOD[s.payment_method] ?? s.payment_method}`
    payload = {
      title: `💵 ${who} is paying`,
      body: `${what} for ${run.division === 'youth' ? 'youth ' : ''}${shortDate(run.run_date)}. Tap to confirm once it lands.`,
      url: `/admin/runs/${s.run_id}`,
    }
    text = `💵 ${who} says they're paying ${what} for the ${shortDate(run.run_date)} ${timeRange(run.start_time, run.end_time)} run. Confirm: ${SITE_URL}${payload.url}`
  } else {
    const { data: p } = await db.from('run_players')
      .update({ notified_at: new Date().toISOString() })
      .eq('id', player_id).eq('status', 'pending').is('notified_at', null).gte('created_at', tenMinutesAgo)
      .select('id, first_name, last_name, phone, division, run_signups(runs(run_date))')
      .maybeSingle()
    if (!p) return json({ sent: 0 })
    payload = {
      title: p.division === 'youth' ? '🏀 New youth run request' : '🏀 New run request',
      body: `${p.first_name} ${p.last_name} wants to join. Tap to approve.`,
      url: `/admin/requests?approve=${p.id}`,
    }
    const wants = (p.run_signups ?? []).map((s: any) => shortDate(s.runs.run_date)).join(', ')
    text = [
      `🏀 New ${p.division === 'youth' ? 'YOUTH ' : ''}run request: ${p.first_name} ${p.last_name} ${fmtPhone(p.phone)}`,
      wants && `Wants: ${wants}`,
      `Approve: ${SITE_URL}${payload.url}`,
    ].filter(Boolean).join('\n')
  }

  const admin = Deno.env.get('RUNS_ADMIN_PHONE')
  if (text && admin) await sendSms(admin, text)

  // Home screen badge: requests waiting + payments waiting
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })
  const [{ count: requests }, { count: payments }] = await Promise.all([
    db.from('run_players').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    db.from('run_signups').select('id, runs!inner(run_date)', { count: 'exact', head: true })
      .eq('paid', false).not('payment_method', 'is', null).gte('runs.run_date', today),
  ])

  webpush.setVapidDetails('mailto:runs@courtflowhoops.com', Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!)
  const { data: subs } = await db.from('run_push_subscriptions').select('*')
  let sent = 0
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ ...payload, badge: (requests ?? 0) + (payments ?? 0) }),
      )
      sent++
    } catch (err) {
      // Phone unsubscribed or app removed — forget it
      if (err?.statusCode === 404 || err?.statusCode === 410) await db.from('run_push_subscriptions').delete().eq('id', s.id)
      else console.error('push failed', err?.statusCode, err?.body)
    }
  }
  return json({ sent })
})
