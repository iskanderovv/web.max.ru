import { useCallback } from 'react'
import { MAX_MESSAGE_LENGTH } from '@/api/green'
import { canDeleteRemotely, canEdit } from '@/lib/messageRules'
import { useChats, type ChatMessage } from '@/store/chats'
import { useGreenApi } from './useGreenApi'

/** Delete/edit with server sync. Both throw a readable error when the API refuses. */
export function useMessageActions(chatId: string) {
  const api = useGreenApi()

  const remove = useCallback(
    async (m: ChatMessage, forEveryone: boolean) => {
      if (canDeleteRemotely(m)) await api.deleteMessage(chatId, m.id, forEveryone)
      useChats.getState().deleteMessage(chatId, m.id)
    },
    [api, chatId],
  )

  const edit = useCallback(
    async (m: ChatMessage, raw: string) => {
      const text = raw.trim()
      if (!canEdit(m)) throw new Error('This message can no longer be edited')
      if (!text || text.length > MAX_MESSAGE_LENGTH) throw new Error('Invalid message text')
      if (text === m.text) return
      await api.editMessage(chatId, m.id, text)
      useChats.getState().editMessageText(chatId, m.id, text)
    },
    [api, chatId],
  )

  return { remove, edit }
}
