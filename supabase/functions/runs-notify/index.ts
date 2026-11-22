// Pings the trainers about a new join request: push notification to every phone that turned
// them on, plus a text to RUNS_ADMIN_PHONE.
//   { player_id }  — called by the public page right after a join request
//   { test: true } — called by a signed-in trainer from admin to check it works
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { SITE_URL, sendSms, shortDate } from '../_shared/sms.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const { player_id, test } = await req.json().catch(() => ({}))
  const url = Deno.env.get('SUPABASE_URL')!
  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  let payload
  if (test) {
    // Only signed-in trainers can send a test
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: { user } } = await db.auth.getUser(token)
    if (!user) return json({ error: 'Not signed in' }, 401)
    payload = { title: 'CourtFlow Runs', body: "Notifications are on 🏀 You'll get pinged for new requests.", url: '/admin/requests' }
  } else {
    // Only a fresh, pending, not-yet-notified request triggers a ping
    const { data: p } = await db.from('run_players')
      .update({ notified_at: new Date().toISOString() })
      .eq('id', player_id).eq('status', 'pending').is('notified_at', null)
      .gte('created_at', new Date(Date.now() - 10 * 60_000).toISOString())
      .select('id, first_name, last_name, phone, division, run_signups(runs(run_date))')
      .maybeSingle()
    if (!p) return json({ sent: 0 })
    payload = { title: p.division === 'youth' ? '🏀 New youth run request' : '🏀 New run request', body: `${p.first_name} ${p.last_name} wants to join. Tap to approve.`, url: `/admin/requests?approve=${p.id}` }

    const admin = Deno.env.get('RUNS_ADMIN_PHONE')
    if (admin) {
      const wants = (p.run_signups ?? []).map((s: any) => shortDate(s.runs.run_date)).join(', ')
      const d = p.phone
      await sendSms(admin, [
        `🏀 New ${p.division === 'youth' ? 'YOUTH ' : ''}run request: ${p.first_name} ${p.last_name} (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`,
        wants && `Wants: ${wants}`,
        `Approve: ${SITE_URL}${payload.url}`,
      ].filter(Boolean).join('\n'))
    }
  }

  const { count } = await db.from('run_players').select('id', { count: 'exact', head: true }).eq('status', 'pending')
  webpush.setVapidDetails('mailto:runs@courtflowhoops.com', Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!)

  const { data: subs } = await db.from('run_push_subscriptions').select('*')
  let sent = 0
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ ...payload, badge: count ?? 0 }),
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
