import { parseIncomingText } from '@/api/schemas'
import { useChats } from '@/store/chats'

/**
 * Applies one queue notification to the chats store.
 * Only messages from chats the user already opened are kept: the instance is a real account,
 * so unrelated conversations and channels must not leak into this UI.
 */
export function applyNotification(body: unknown): boolean {
  const msg = parseIncomingText(body)
  if (!msg) return false
  const { chats, addMessage } = useChats.getState()
  if (!chats[msg.chatId]) return false
  return addMessage(msg.chatId, {
    id: msg.idMessage,
    text: msg.text,
    direction: 'in',
    timestamp: msg.timestamp,
    status: 'sent',
    author: msg.senderName,
  })
}
