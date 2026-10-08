import { dayKey, formatTime } from './time'

/**
 * Telegram exposes no presence events, only `lastSeen`. A value this fresh means the user is
 * active right now; the window is a heuristic, so the label stays approximate.
 */
export const ONLINE_WINDOW_SEC = 90

/** "online" / "last seen today at 14:05" / "last seen recently" (hidden by privacy). */
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
