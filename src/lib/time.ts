const pad = (n: number) => String(n).padStart(2, '0')

export function formatTime(ts: number) {
  const d = new Date(ts * 1000)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

export function dayKey(ts: number) {
  return startOfDay(new Date(ts * 1000))
}

/** "Today", "Yesterday" or "October 8". */
export function dayLabel(ts: number, nowMs = Date.now()) {
  const day = dayKey(ts)
  const today = startOfDay(new Date(nowMs))
  if (day === today) return 'Today'
  if (day === today - 86_400_000) return 'Yesterday'
  const d = new Date(ts * 1000)
  const sameYear = d.getFullYear() === new Date(nowMs).getFullYear()
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

/** Sidebar timestamp: time for today, otherwise short date. */
export function formatListTime(ts: number, nowMs = Date.now()) {
  if (dayKey(ts) === startOfDay(new Date(nowMs))) return formatTime(ts)
  return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
