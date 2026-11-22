// Remembers who's on this device (per division) + their signup tokens, so returning players
// skip the dropdown. localStorage can throw (private mode) — everything still works without it.

const TOKENS = 'runs-tokens'
const meKey = division => (division === 'youth' ? 'runs-me-youth' : 'runs-me')
const pendingKey = division => (division === 'youth' ? 'runs-pending-youth' : 'runs-pending')

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}

function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore */ }
}

function remove(...keys) {
  try { keys.forEach(k => localStorage.removeItem(k)) } catch { /* ignore */ }
}

export function getMe(division) { return read(meKey(division), null) }
export function setMe(division, me) { write(meKey(division), me); remove(pendingKey(division)) }
export function forgetMe(division) { remove(meKey(division), pendingKey(division)) }

// A request that's waiting on approval — becomes "me" once their name shows up in the list
export function getPending(division) { return read(pendingKey(division), null) }
export function setPending(division, p) { write(pendingKey(division), p) }

export function getToken(runId) { return read(TOKENS, {})[runId] ?? null }
export function setToken(runId, token) { write(TOKENS, { ...read(TOKENS, {}), [runId]: token }) }
