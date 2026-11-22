import { payInstructions, useSettings } from '../lib/pay'
import CopyButton from './CopyButton'

export default function PayInstructions({ method, run, me }) {
  const settings = useSettings(run.division)
  if (!settings) return null
  const p = payInstructions(method, run, me, settings)
  return (
    <div className="space-y-2.5">
      {p.steps.map(s => <p key={s} className="text-sm text-fg/75">{s}</p>)}
      {p.copyValue && <CopyButton value={p.copyValue} />}
      {p.extra && <p className="text-sm text-fg/75">{p.extra}</p>}
      {p.copy && <CopyButton value={p.copy} />}
      {p.cta && (
        <a href={p.href} target="_blank" rel="noopener noreferrer" className="btn-primary w-full py-3 text-base">
          {p.cta}
        </a>
      )}
    </div>
  )
}
