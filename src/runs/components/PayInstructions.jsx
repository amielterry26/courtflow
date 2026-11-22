import { payInstructions, useSettings } from '../lib/pay'
import CopyButton from './CopyButton'

export default function PayInstructions({ method, run, me }) {
  const settings = useSettings(run.division)
  if (!settings) return null
  const p = payInstructions(method, run, me, settings)

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
        <a href={p.href} target="_blank" rel="noopener noreferrer" className="btn-primary w-full py-3 text-base">
          {p.cta}
        </a>
      )}
      {method !== 'member' && (
        <p className="text-center text-xs text-muted">Amiel gets a heads-up and confirms your payment. You'll get a text when you're in.</p>
      )}
    </div>
  )
}
