import type { GreenApi } from '@/api/green'
import type { HistoryMessage } from '@/api/schemas'
import { useChats, type ChatMessage } from '@/store/chats'

export const HISTORY_SIZE = 30

const toChatMessage = (m: HistoryMessage): ChatMessage => ({
  id: m.id,
  text: m.text,
  direction: m.direction,
  timestamp: m.timestamp,
  status: m.direction === 'out' ? (m.delivery ?? 'sent') : 'sent',
})

/** Loads the latest server history into a chat that has no local messages yet. */
export async function loadHistory(api: GreenApi, chatId: string, signal?: AbortSignal) {
  const history = await api.getChatHistory(chatId, HISTORY_SIZE, signal)
  useChats.getState().importHistory(chatId, history.map(toChatMessage))
}

/** Refreshes delivered/read marks of outgoing messages from the server history. */
export async function syncDelivery(api: GreenApi, chatId: string, signal?: AbortSignal) {
  const history = await api.getChatHistory(chatId, HISTORY_SIZE, signal)
  const delivery: Record<string, 'delivered' | 'read'> = {}
  for (const m of history) if (m.delivery) delivery[m.id] = m.delivery
  useChats.getState().applyDelivery(chatId, delivery)
}

/** True while some outgoing message can still turn into `read`. */
export function hasUnreadOutgoing(messages: ChatMessage[]) {
  return messages.some(
    (m) => m.direction === 'out' && (m.status === 'sent' || m.status === 'delivered'),
  )
}
