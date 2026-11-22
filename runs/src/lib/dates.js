// All run dates are plain 'YYYY-MM-DD' strings — never parse them with new Date(str) (UTC shift).

export function toKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayKey() {
  return toKey(new Date())
}

export function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 || 12
  return m ? `${hour}:${String(m).padStart(2, '0')} ${suffix}` : `${hour} ${suffix}`
}

export function timeRange(start, end) {
  return end ? `${formatTime(start)} – ${formatTime(end)}` : formatTime(start)
}

export function weekday(key, style = 'long') {
  return fromKey(key).toLocaleDateString('en-US', { weekday: style })
}

export function shortDate(key) {
  return fromKey(key).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function monthDay(key) {
  const d = fromKey(key)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function relativeDay(key) {
  const diff = Math.round((fromKey(key) - fromKey(todayKey())) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff < 7) return weekday(key)
  return shortDate(key)
}

// 6-week grid of Date objects starting on the Sunday before the 1st
export function monthGrid(year, month) {
  const first = new Date(year, month, 1)
  const start = new Date(year, month, 1 - first.getDay())
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
}
