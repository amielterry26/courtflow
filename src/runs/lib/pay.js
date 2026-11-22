import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { monthDay } from './dates'

// Payment handles, Stripe links and prices live in run_settings, one row per division (edited in admin)
const settingsCache = {}

export function loadSettings(division = 'adult', fresh = false) {
  if (!settingsCache[division] || fresh) {
    settingsCache[division] = supabase.from('run_settings').select('*').eq('division', division).single().then(({ data }) => data ?? {})
  }
  return settingsCache[division]
}

export function useSettings(division = 'adult') {
  const [settings, setSettings] = useState(null)
  useEffect(() => { loadSettings(division).then(setSettings) }, [division])
  return settings
}

const cashtag = s => (s.cashapp_tag ?? '').replace(/^\$/, '')
const digits = p => (p ?? '').replace(/\D/g, '')

export function payMethods(s) {
  return [
    cashtag(s) && { id: 'cash_app', label: 'Cash App', icon: '💵' },
    digits(s.apple_cash_phone) && { id: 'apple_cash', label: 'Apple Cash', icon: '📱' },
    s.zelle && { id: 'zelle', label: 'Zelle', icon: '⚡' },
    { id: 'cash', label: 'Cash at the run', icon: '🤝' },
  ].filter(Boolean)
}

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
  return `sms:+1${digits(phone).slice(-10)}${isIOS() ? '&' : '?'}body=${encodeURIComponent(body)}`
}

// What to show after someone picks how they're paying: short steps with copy buttons.
// None of these apps let a website send money or confirm it, so Amiel confirms in admin
// (he gets a notification as soon as someone picks a method).
export function payInstructions(method, run, me, s) {
  const amount = Number(run.price)
  const note = payNote(run, me)
  const name = s.pay_name || 'Amiel'
  switch (method) {
    case 'cash_app':
      return {
        steps: [
          { text: `Send $${amount} on Cash App to:`, copy: `$${cashtag(s)}` },
          { text: 'Add this note:', copy: note },
        ],
        href: `https://cash.app/$${cashtag(s)}/${amount}`,
        cta: 'Open Cash App',
      }
    case 'apple_cash':
      return {
        steps: [{ text: `Tap below to text ${name}, then tap the Apple Cash button and send $${amount}.` }],
        href: smsLink(s.apple_cash_phone, `Sending $${amount} Apple Cash for the ${note}`),
        cta: `Text ${name} · Apple Cash $${amount}`,
      }
    case 'zelle':
      return {
        steps: [
          { text: `Send $${amount} on Zelle (from your bank app) to:`, copy: s.zelle },
          { text: 'Memo:', copy: note },
        ],
      }
    case 'member':
      return { steps: [{ text: "You're on Unlimited. Nothing to pay." }] }
    default:
      return { steps: [{ text: `Bring $${amount} cash to the run and hand it to ${name}.` }] }
  }
}

export function membershipLink(s, playerId) {
  const url = s.stripe_membership_url
  if (!url) return ''
  if (!playerId) return url
  return `${url}${url.includes('?') ? '&' : '?'}client_reference_id=${playerId}`
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
  const list = phones.map(p => `+1${digits(p).slice(-10)}`).join(',')
  return isIOS()
    ? `sms:/open?addresses=${list}&body=${encodeURIComponent(body)}`
    : `sms:${list}?body=${encodeURIComponent(body)}`
}

export function formatPhone(p) {
  return p?.length === 10 ? `(${p.slice(0, 3)}) ${p.slice(3, 6)}-${p.slice(6)}` : p
}
