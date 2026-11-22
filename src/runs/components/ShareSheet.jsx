import { runUrl, shareText } from '../lib/notify'
import { shortDate } from '../lib/dates'
import CopyButton from './CopyButton'

// Share popup for one run: native share (iPhone), text it, or copy the link
export default function ShareSheet({ run, onClose }) {
  const url = runUrl(run)
  const text = shareText(run)
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)

  async function nativeShare() {
    try { await navigator.share({ title: 'CourtFlow Hoops · Open run', text, url }) } catch { /* dismissed */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full space-y-3 rounded-t-3xl border border-line bg-surface px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 sm:max-w-md sm:rounded-3xl sm:pb-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="label mb-0 text-hoop">Share this run</p>
            <h3 className="font-display text-3xl font-extrabold uppercase leading-tight">{shortDate(run.run_date)}</h3>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-2xl leading-none text-muted">×</button>
        </div>
        <p className="rounded-xl bg-raised p-3 text-sm text-fg/80">{text} <span className="text-hoop">{url.replace(/^https?:\/\//, '')}</span></p>
        {navigator.share && <button onClick={nativeShare} className="btn-primary w-full py-3 text-base">↗ Share</button>}
        <a href={`sms:${ios ? '&' : '?'}body=${encodeURIComponent(`${text} ${url}`)}`} className="btn-ghost w-full py-3">💬 Text it</a>
        <CopyButton value={`${text} ${url}`} label="Copy invite + link" />
      </div>
    </div>
  )
}
