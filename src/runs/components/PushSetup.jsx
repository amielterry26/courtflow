import { useEffect, useState } from 'react'
import { disablePush, enablePush, getSubscription, isIOS, isStandalone, pushSupported, sendTestPush } from '../lib/push'

// Get pinged on your phone for new join requests
export default function PushSetup({ compact }) {
  const [on, setOn] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { getSubscription().then(s => setOn(!!s)) }, [])

  async function turnOn() {
    setBusy(true)
    setMsg('')
    try {
      await enablePush()
      setOn(true)
      await sendTestPush()
      setMsg('Sent you a test notification.')
    } catch (err) {
      setMsg(err.message)
    }
    setBusy(false)
  }

  async function test() {
    setMsg('')
    const { data, error } = await sendTestPush()
    setMsg(error ? error.message : data?.sent ? 'Test sent.' : 'No phones signed up yet.')
  }

  async function turnOff() {
    await disablePush()
    setOn(false)
  }

  // iPhone needs the app on the home screen before it can get notifications
  if (isIOS && !isStandalone) {
    return (
      <div className="card p-4">
        <p className="font-semibold">🔔 Get pinged for new requests</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-fg/75">
          <li>Tap <b>Share</b> (the square with the arrow) at the bottom of Safari</li>
          <li>Tap <b>Add to Home Screen</b> → <b>Add</b></li>
          <li>Open <b>Runs</b> from your home screen, sign in, and tap Turn on here</li>
        </ol>
      </div>
    )
  }

  if (!pushSupported) {
    return compact ? null : <div className="card p-4 text-sm text-muted">This browser can't do notifications.</div>
  }

  if (on === null || (compact && on)) return null

  return (
    <div className="card p-4">
      {on ? (
        <>
          <p className="font-semibold">🔔 Notifications are on for this device</p>
          <div className="mt-3 flex gap-2">
            <button onClick={test} className="btn-ghost flex-1 py-2">Send test</button>
            <button onClick={turnOff} className="btn-ghost flex-1 py-2 text-muted">Turn off</button>
          </div>
        </>
      ) : (
        <>
          <p className="font-semibold">🔔 Get pinged for new requests</p>
          <p className="mt-0.5 text-sm text-fg/75">A notification on this device whenever someone asks to join.</p>
          <button onClick={turnOn} disabled={busy} className="btn-primary mt-3 w-full py-3">{busy ? 'Turning on…' : 'Turn on notifications'}</button>
        </>
      )}
      {msg && <p className="mt-2 text-sm text-muted">{msg}</p>}
    </div>
  )
}
