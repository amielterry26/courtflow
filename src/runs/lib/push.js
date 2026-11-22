import { supabase } from './supabase'

// Public half of the VAPID key pair (private half is a Supabase function secret)
const VAPID_PUBLIC_KEY = 'BCIfmU0FF27fBbk2f7afZmLiaGQegZOtbhEaQXr9-L4L4nX1T844Nl98ZV9t85DlAX9zjFAbBc8BXgLIO3v7VMQ'

export const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
export const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
export const pushSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

function keyBytes(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

export async function getSubscription() {
  if (!pushSupported) return null
  const reg = await navigator.serviceWorker.getRegistration('/')
  return reg ? reg.pushManager.getSubscription() : null
}

export async function enablePush() {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notifications are blocked. Turn them on in iPhone Settings → Notifications → Runs.')
  await navigator.serviceWorker.register('/runs-sw.js')
  const reg = await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription())
    ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) })
  const { endpoint, keys } = sub.toJSON()
  const { error } = await supabase.from('run_push_subscriptions')
    .upsert({ endpoint, p256dh: keys.p256dh, auth: keys.auth }, { onConflict: 'endpoint' })
  if (error) throw error
}

export async function disablePush() {
  const sub = await getSubscription()
  if (!sub) return
  await supabase.from('run_push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}

export function sendTestPush() {
  return supabase.functions.invoke('runs-notify', { body: { test: true } })
}

// Pings the trainers' phones about a new request (the function checks it's real)
export function pushRequest(playerId) {
  return supabase.functions.invoke('runs-notify', { body: { player_id: playerId } }).catch(() => {})
}

export function setBadge(count) {
  if (!('setAppBadge' in navigator)) return
  ;(count ? navigator.setAppBadge(count) : navigator.clearAppBadge()).catch(() => {})
}
