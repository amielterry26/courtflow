import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// runs.courtflowhoops.com serves the pickup runs app from this same build.
// Locally: http://runs.localhost:5173
const isRuns = window.location.hostname.startsWith('runs.')

const load = isRuns ? import('./runs/main.js') : import('./App.jsx')

load.then(({ default: App }) => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})

// Trainer app only — the runs site needs live data, not cached
if (!isRuns && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(console.error)
  })
}
