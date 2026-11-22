// Remembers who's on this device + their signup tokens, so returning players skip the dropdown.
// localStorage can throw (private mode) — everything still works without it.

const ME = 'runs-me'
const PENDING = 'runs-pending'
const TOKENS = 'runs-tokens'

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}

function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore */ }
}

function remove(...keys) {
  try { keys.forEach(k => localStorage.removeItem(k)) } catch { /* ignore */ }
}

export function getMe() { return read(ME, null) }
export function setMe(me) { write(ME, me); remove(PENDING) }
export function forgetMe() { remove(ME, PENDING, TOKENS) }

// A request that's waiting on approval — becomes "me" once their name shows up in the list
export function getPending() { return read(PENDING, null) }
export function setPending(p) { write(PENDING, p) }

export function getToken(runId) { return read(TOKENS, {})[runId] ?? null }
export function setToken(runId, token) { write(TOKENS, { ...read(TOKENS, {}), [runId]: token }) }
