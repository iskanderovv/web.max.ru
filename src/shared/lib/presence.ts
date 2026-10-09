import { dayKey, formatTime } from './time'

const ONLINE_WINDOW_SEC = 90

export function presenceText(lastSeen: number | undefined, nowMs = Date.now()) {
  if (!lastSeen) return 'last seen recently'
  const nowSec = Math.floor(nowMs / 1000)
  if (nowSec - lastSeen <= ONLINE_WINDOW_SEC) return 'online'

  const today = dayKey(nowSec)
  const day = dayKey(lastSeen)
  if (day === today) return `last seen today at ${formatTime(lastSeen)}`
  if (day === today - 86_400_000) return `last seen yesterday at ${formatTime(lastSeen)}`
  const d = new Date(lastSeen * 1000)
  const sameYear = d.getFullYear() === new Date(nowMs).getFullYear()
  return `last seen ${d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })}`
}

export const isOnline = (text: string) => text === 'online'
