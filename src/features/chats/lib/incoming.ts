import { parseIncomingText, parseOutgoingStatus } from '@/api/schemas'
import { useChats } from '@/features/chats/store'

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
