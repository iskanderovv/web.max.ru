import type { ChatMessage } from '@/features/chats/store'

export const EDIT_WINDOW_SEC = 48 * 3600

const isLocalId = (id: string) => id.startsWith('local-')

const isServerMessage = (m: ChatMessage) =>
  !isLocalId(m.id) && m.status !== 'sending' && m.status !== 'failed'

export const canEdit = (m: ChatMessage, nowSec = Math.floor(Date.now() / 1000)) =>
  m.direction === 'out' && isServerMessage(m) && nowSec - m.timestamp < EDIT_WINDOW_SEC

export const canDeleteRemotely = (m: ChatMessage) => m.direction === 'out' && isServerMessage(m)
