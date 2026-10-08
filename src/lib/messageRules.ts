import type { ChatMessage } from '@/store/chats'

/** Telegram allows editing own messages for about 48 hours. */
export const EDIT_WINDOW_SEC = 48 * 3600

export const isLocalId = (id: string) => id.startsWith('local-')

/** Delivered to the server (has a server-side id). */
export const isServerMessage = (m: ChatMessage) =>
  !isLocalId(m.id) && m.status !== 'sending' && m.status !== 'failed'

export const canEdit = (m: ChatMessage, nowSec = Math.floor(Date.now() / 1000)) =>
  m.direction === 'out' && isServerMessage(m) && nowSec - m.timestamp < EDIT_WINDOW_SEC

/** Only our own delivered messages can be removed on the Telegram side. */
export const canDeleteRemotely = (m: ChatMessage) => m.direction === 'out' && isServerMessage(m)
