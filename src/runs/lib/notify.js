import { shortDate, timeRange } from './dates'
import { formatPhone, loadSettings } from './pay'

// Emails Amiel when someone requests to join (same Web3Forms key as the intake form)
export async function notifyRequest(player, run, phone) {
  const key = import.meta.env.VITE_WEB3FORMS_KEY
  if (!key) return console.warn('VITE_WEB3FORMS_KEY not set — request email skipped')
  const s = await loadSettings()
  const approveUrl = `${window.location.origin}/admin/requests?approve=${player.player_id}`
  try {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_key: key,
        subject: `🏀 Run request: ${player.first_name} ${player.last_name}`,
        from_name: 'CourtFlow Hoops Runs',
        ...(s.notify_email ? { cc: s.notify_email } : {}),
        message: [
          `${player.first_name} ${player.last_name} wants to join the runs.`,
          `Phone: ${formatPhone(phone.replace(/\D/g, '').slice(-10))}`,
          run ? `Run: ${shortDate(run.run_date)}, ${timeRange(run.start_time, run.end_time)}${run.gym_name ? ` at ${run.gym_name}` : ''}` : '',
          '',
          `Approve: ${approveUrl}`,
        ].join('\n'),
      }),
    })
    const j = await res.json()
    if (!j.success) console.error('Web3Forms failed:', j)
  } catch (err) {
    console.error('Web3Forms error:', err)
  }
}

export function runUrl(run, join = false) {
  return `${window.location.origin}/?date=${run.run_date}${join ? `&join=${run.id}` : ''}`
}

export function shareText(run) {
  return `🏀 Open run ${shortDate(run.run_date)} · ${timeRange(run.start_time, run.end_time)}${run.gym_name ? ` at ${run.gym_name}` : ''}. Invite only — register here:`
}
