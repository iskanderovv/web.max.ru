import { useCallback } from 'react'
import { MAX_MESSAGE_LENGTH } from '@/api/green'
import { useChats } from '@/features/chats/store'
import { useGreenApi } from '@/features/auth/hooks/useGreenApi'

const localId = () => `local-${crypto.randomUUID()}`
const nowSec = () => Math.floor(Date.now() / 1000)

export function useSendMessage() {
  const api = useGreenApi()

  const deliver = useCallback(
    async (chatId: string, id: string, text: string) => {
      const { updateMessage } = useChats.getState()
      try {
        const { idMessage } = await api.sendMessage(chatId, text)
        updateMessage(chatId, id, { id: idMessage, status: 'sent' })
      } catch {
        updateMessage(chatId, id, { status: 'failed' })
      }
    },
    [api],
  )

  const send = useCallback(
    (chatId: string, raw: string) => {
      const text = raw.trim()
      if (!text || text.length > MAX_MESSAGE_LENGTH) return false
      const id = localId()
      const added = useChats.getState().addMessage(chatId, {
        id,
        text,
        direction: 'out',
        timestamp: nowSec(),
        status: 'sending',
      })
      if (added) void deliver(chatId, id, text)
      return added
    },
    [deliver],
  )

  const retry = useCallback(
    (chatId: string, id: string, text: string) => {
      useChats.getState().updateMessage(chatId, id, { status: 'sending' })
      void deliver(chatId, id, text)
    },
    [deliver],
  )

  return { send, retry }
}
