// Twilio texting for the runs site. Needs secrets: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
// and TWILIO_FROM (+1702...) or TWILIO_MESSAGING_SERVICE_SID.
export const SITE_URL = 'https://runs.courtflowhoops.com'

export function toE164(phone: string) {
  const d = (phone ?? '').replace(/\D/g, '').slice(-10)
  return d.length === 10 ? `+1${d}` : null
}

// confirm: wait a few seconds for the carrier's verdict instead of trusting "queued"
export async function sendSms(phone: string, body: string, confirm = false): Promise<{ ok: boolean; error?: string }> {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const token = Deno.env.get('TWILIO_AUTH_TOKEN')
  const from = Deno.env.get('TWILIO_FROM')
  const service = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID')
  const to = toE164(phone)
  if (!sid || !token || !(from || service)) return { ok: false, error: 'Texting not set up yet' }
  if (!to) return { ok: false, error: 'Bad phone number' }

  const form = new URLSearchParams({ To: to, Body: body })
  if (service) form.set('MessagingServiceSid', service)
  else form.set('From', from!)

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${btoa(`${sid}:${token}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  })
  if (res.ok) {
    if (!confirm) return { ok: true }
    const msg = await res.json()
    for (let i = 0; i < 6; i++) {
      await new Promise(r => setTimeout(r, 1500))
      const check = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages/${msg.sid}.json`, {
        headers: { Authorization: `Basic ${btoa(`${sid}:${token}`)}` },
      }).then(r => r.json()).catch(() => null)
      if (check?.status === 'delivered') return { ok: true }
      if (check?.status === 'undelivered' || check?.status === 'failed') {
        return { ok: false, error: check.error_code === 30034 ? 'texting is still waiting on carrier approval' : `carrier rejected it (${check.error_code})` }
      }
    }
    return { ok: true } // still sending after ~9s — almost always delivers
  }
  const err = await res.json().catch(() => ({}))
  console.error('twilio failed', res.status, err)
  return { ok: false, error: err.message ?? `Twilio error ${res.status}` }
}

// ─── Formatting (run dates are 'YYYY-MM-DD', times 'HH:MM:SS') ──────────────
export function shortDate(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric', timeZone: 'UTC' })
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const hour = h % 12 || 12
  return `${hour}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h >= 12 ? 'PM' : 'AM'}`
}

export function timeRange(start: string, end: string | null) {
  return end ? `${formatTime(start)}–${formatTime(end)}` : formatTime(start)
}

export function divisionUrl(division?: string) {
  return `${SITE_URL}${division === 'youth' ? '/youth' : ''}`
}

export function runLink(run: { id: string; run_date: string; division?: string }, join = false) {
  return `${divisionUrl(run.division)}/?date=${run.run_date}${join ? `&join=${run.id}` : ''}`
}

// Today's date in Las Vegas
export function pacificToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })
}

export function pacificHour() {
  return Number(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', hour12: false }))
}
