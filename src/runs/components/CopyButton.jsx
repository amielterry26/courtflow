import { useState } from 'react'

export default function CopyButton({ value, label }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      window.prompt('Copy this:', value)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button type="button" onClick={copy}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-court px-3 py-2.5 text-left text-sm">
      <span className="truncate font-medium">{label ?? value}</span>
      <span className={`shrink-0 text-xs font-semibold ${copied ? 'text-green-400' : 'text-hoop'}`}>
        {copied ? 'Copied ✓' : 'Copy'}
      </span>
    </button>
  )
}
