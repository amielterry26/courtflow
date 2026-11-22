// Stripe webhook → keeps run_players.is_member in sync with Unlimited subscriptions.
//   checkout.session.completed      → mark the player Unlimited (matched by client_reference_id, then phone)
//   customer.subscription.updated   → Unlimited while active / trialing / past_due
//   customer.subscription.deleted   → no longer Unlimited
// Needs secret STRIPE_WEBHOOK_SECRET.
import { createClient } from 'npm:@supabase/supabase-js@2'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function validSignature(raw: string, header: string | null, secret: string) {
  if (!header) return false
  const parts = Object.fromEntries(header.split(',').map(p => p.split('=') as [string, string]))
  const sigs = header.split(',').filter(p => p.startsWith('v1=')).map(p => p.slice(3))
  const t = Number(parts.t)
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${raw}`))
  const hex = [...new Uint8Array(mac)].map(b => b.toString(16).padStart(2, '0')).join('')
  return sigs.includes(hex)
}

Deno.serve(async (req) => {
  const raw = await req.text()
  if (!(await validSignature(raw, req.headers.get('stripe-signature'), Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''))) {
    return new Response('bad signature', { status: 400 })
  }
  const event = JSON.parse(raw)
  const obj = event.data.object

  if (event.type === 'checkout.session.completed' && obj.mode === 'subscription') {
    const division = obj.metadata?.division === 'youth' ? 'youth' : 'adult'
    const phone = (obj.customer_details?.phone ?? '').replace(/\D/g, '').slice(-10)
    let player = null
    if (UUID.test(obj.client_reference_id ?? '')) {
      ({ data: player } = await db.from('run_players').select('id, status').eq('id', obj.client_reference_id).maybeSingle())
    }
    if (!player && phone.length === 10) {
      ({ data: player } = await db.from('run_players').select('id, status').eq('phone', phone).eq('division', division).maybeSingle())
    }
    if (player) {
      // Paying member → approved too
      await db.from('run_players').update({ is_member: true, stripe_customer_id: obj.customer, status: 'approved' }).eq('id', player.id)
    } else if (phone.length === 10) {
      // Subscribed before ever joining — add them so their name shows up
      const [first, ...rest] = (obj.customer_details?.name ?? 'New Member').trim().split(/\s+/)
      await db.from('run_players').insert({
        first_name: first, last_name: rest.join(' ') || '-', phone, division,
        status: 'approved', is_member: true, stripe_customer_id: obj.customer,
      })
    }
  }

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const active = event.type === 'customer.subscription.updated' && ['active', 'trialing', 'past_due'].includes(obj.status)
    await db.from('run_players').update({ is_member: active }).eq('stripe_customer_id', obj.customer)
  }

  return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } })
})
