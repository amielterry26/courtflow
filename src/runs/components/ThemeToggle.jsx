import { useState } from 'react'
import { isDark, toggleTheme } from '../lib/theme'

export default function ThemeToggle() {
  const [dark, setDark] = useState(isDark())
  return (
    <button onClick={() => { toggleTheme(); setDark(isDark()) }} aria-label="Toggle light and dark mode"
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-sm hover:bg-raised">
      {dark ? '☀️' : '🌙'}
    </button>
  )
}
