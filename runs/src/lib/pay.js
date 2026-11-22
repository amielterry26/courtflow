import { monthDay } from './dates'

const env = import.meta.env

export const PAY_NAME = env.VITE_PAY_NAME || 'Amiel'
export const STRIPE_MEMBERSHIP_URL = env.VITE_STRIPE_MEMBERSHIP_URL || ''
export const STRIPE_PORTAL_URL = env.VITE_STRIPE_PORTAL_URL || ''

const cashtag = (env.VITE_CASHAPP_TAG || '').replace(/^\$/, '')
const zelle = env.VITE_ZELLE || ''
const appleCash = (env.VITE_APPLE_CASH_PHONE || '').replace(/\D/g, '')

export const METHODS = [
  cashtag && { id: 'cash_app', label: 'Cash App', icon: '💵' },
  appleCash && { id: 'apple_cash', label: 'Apple Cash', icon: '📱' },
  zelle && { id: 'zelle', label: 'Zelle', icon: '⚡' },
  { id: 'cash', label: 'Cash at the run', icon: '🤝' },
].filter(Boolean)

export const METHOD_LABELS = {
  cash_app: 'Cash App', apple_cash: 'Apple Cash', zelle: 'Zelle', cash: 'Cash', member: 'Member',
}

export function payNote(run, me) {
  return `Run ${monthDay(run.run_date)} – ${me.first_name} ${me.last_name}`
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function smsLink(phone, body) {
  const digits = phone.replace(/\D/g, '')
  return `sms:+1${digits.slice(-10)}${isIOS() ? '&' : '?'}body=${encodeURIComponent(body)}`
}

// What to show after someone picks how they're paying
export function payInstructions(method, run, me) {
  const amount = Number(run.price)
  const note = payNote(run, me)
  switch (method) {
    case 'cash_app':
      return {
        href: `https://cash.app/$${cashtag}/${amount}`,
        cta: `Open Cash App · $${amount}`,
        steps: [`Sends $${amount} to $${cashtag}`, 'Paste this in the "For" note:'],
        copy: note,
      }
    case 'apple_cash':
      return {
        href: smsLink(appleCash, `${note} — sending $${amount} Apple Cash`),
        cta: `Open Messages · $${amount}`,
        steps: [`Opens a text to ${PAY_NAME}`, `Tap the Apple Cash button and send $${amount}`],
      }
    case 'zelle':
      return {
        cta: null,
        steps: [`Open your bank app → Zelle → send $${amount} to:`],
        copyLabel: zelle,
        copyValue: zelle,
        extra: 'Memo:',
        copy: note,
      }
    case 'member':
      return { cta: null, steps: ['Covered by your membership. See you on the court.'] }
    default:
      return { cta: null, steps: [`Bring $${amount} cash to the run.`] }
  }
}

export function membershipLink(playerId) {
  if (!STRIPE_MEMBERSHIP_URL) return ''
  if (!playerId) return STRIPE_MEMBERSHIP_URL
  const sep = STRIPE_MEMBERSHIP_URL.includes('?') ? '&' : '?'
  return `${STRIPE_MEMBERSHIP_URL}${sep}client_reference_id=${playerId}`
}

export function mapsLinks(run) {
  const q = encodeURIComponent(run.gym_address || run.gym_name || '')
  return {
    apple: `https://maps.apple.com/?q=${encodeURIComponent(run.gym_name || '')}&address=${q}`,
    google: run.gym_maps_url?.includes('google') ? run.gym_maps_url : `https://www.google.com/maps/search/?api=1&query=${q}`,
    embed: run.gym_address ? `https://maps.google.com/maps?q=${q}&z=15&output=embed` : null,
  }
}

// One text to several people (admin reminders)
export function groupSmsLink(phones, body) {
  const list = phones.map(p => `+1${p.replace(/\D/g, '').slice(-10)}`).join(',')
  return isIOS()
    ? `sms:/open?addresses=${list}&body=${encodeURIComponent(body)}`
    : `sms:${list}?body=${encodeURIComponent(body)}`
}

export function formatPhone(p) {
  return p?.length === 10 ? `(${p.slice(0, 3)}) ${p.slice(3, 6)}-${p.slice(6)}` : p
}
