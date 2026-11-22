import { payInstructions, useSettings } from '../lib/pay'
import CopyButton from './CopyButton'

export default function PayInstructions({ method, run, me }) {
  const settings = useSettings(run.division)
  if (!settings) return null
  const p = payInstructions(method, run, me, settings)

  function open() {
    // Copy the note on the same tap that opens the app, so it's ready to paste
    if (p.copyOnTap) navigator.clipboard?.writeText(p.copyOnTap).catch(() => {})
  }

  return (
    <div className="space-y-3">
      <ol className="space-y-3">
        {p.steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            {p.steps.length > 1 && (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-hoop text-xs font-bold text-white">{i + 1}</span>
            )}
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-sm text-fg/85">{step.text}</p>
              {step.copy && <CopyButton value={step.copy} />}
            </div>
          </li>
        ))}
      </ol>
      {p.cta && (
        <a href={p.href} onClick={open} target="_blank" rel="noopener noreferrer" className="btn-primary w-full py-3 text-base">
          {p.cta}
        </a>
      )}
      {method !== 'member' && (
        <p className="text-center text-xs text-muted">Once Amiel sees your payment, you'll show as In.</p>
      )}
    </div>
  )
}
