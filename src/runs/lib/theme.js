// Light/dark for the runs site: follows the phone every time the app opens. The toggle only
// lasts for the current visit (sessionStorage), so it never gets stuck on the wrong mode.
const KEY = 'runs-theme'

// Older versions saved the choice forever — clear it so the phone's setting wins
try { localStorage.removeItem(KEY) } catch { /* ignore */ }
const media = window.matchMedia('(prefers-color-scheme: dark)')

function saved() {
  try { return sessionStorage.getItem(KEY) } catch { return null }
}

export function isDark() {
  return document.documentElement.classList.contains('dark')
}

export function applyTheme() {
  const dark = saved() ? saved() === 'dark' : media.matches
  document.documentElement.classList.toggle('dark', dark)
  let meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  meta.content = dark ? '#0c0d10' : '#f4f5f7'
}

export function toggleTheme() {
  try { sessionStorage.setItem(KEY, isDark() ? 'light' : 'dark') } catch { /* ignore */ }
  applyTheme()
}

media.addEventListener('change', () => { if (!saved()) applyTheme() })
