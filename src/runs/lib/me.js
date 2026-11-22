// Remembers who's on this device + their signup tokens, so returning players skip the dropdown.
// localStorage can throw (private mode) — everything still works without it.

const ME = 'runs-me'
const TOKENS = 'runs-tokens'

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}

function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore */ }
}

export function getMe() { return read(ME, null) }
export function setMe(me) { write(ME, me) }
export function forgetMe() { try { localStorage.removeItem(ME); localStorage.removeItem(TOKENS) } catch { /* ignore */ } }

export function getToken(runId) { return read(TOKENS, {})[runId] ?? null }
export function setToken(runId, token) { write(TOKENS, { ...read(TOKENS, {}), [runId]: token }) }
