import { Link } from 'react-router-dom'

// Optional text-message opt-in shown on the request and invite forms (unchecked by default)
export default function SmsConsent({ checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-raised p-3 text-xs leading-relaxed text-fg/80">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[rgb(var(--hoop))]" />
      <span>
        Text me about runs I sign up for (approval and day-before reminders) from CourtFlow Hoops.
        Msg &amp; data rates may apply. Msg frequency varies. Reply STOP to opt out, HELP for help.{' '}
        <Link to="/terms" target="_blank" className="underline">Terms</Link> · <Link to="/privacy" target="_blank" className="underline">Privacy</Link>
      </span>
    </label>
  )
}
