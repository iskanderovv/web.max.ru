import { parseIncomingText, parseOutgoingStatus } from '@/api/schemas'
import { useChats } from '@/store/chats'

/**
 * Applies one queue notification to the chats store.
 * Only messages from chats the user already opened are kept: the instance is a real account,
 * so unrelated conversations and channels must not leak into this UI.
 */
export function applyNotification(body: unknown): boolean {
  const status = parseOutgoingStatus(body)
  if (status) return applyStatus(status)

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

/** Delivery / read marks and send failures for messages we sent. */
function applyStatus({
  chatId,
  idMessage,
  status,
}: NonNullable<ReturnType<typeof parseOutgoingStatus>>) {
  const { chats, applyDelivery, updateMessage } = useChats.getState()
  const known = chats[chatId]?.messages.some((m) => m.id === idMessage && m.direction === 'out')
  if (!known) return false
  if (status === 'failed') updateMessage(chatId, idMessage, { status: 'failed' })
  else applyDelivery(chatId, { [idMessage]: status })
  return true
}
