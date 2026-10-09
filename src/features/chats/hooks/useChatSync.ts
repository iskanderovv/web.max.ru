import { useEffect } from 'react'
import { isAbortError } from '@/api/errors'
import { hasUnreadOutgoing, loadHistory, syncDelivery } from '@/features/chats/lib/sync'
import { useChats } from '@/features/chats/store'
import { useGreenApi } from '@/features/auth/hooks/useGreenApi'

const DELIVERY_POLL_MS = 20_000

export function useChatSync(chatId: string) {
  const api = useGreenApi()

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    let timer: ReturnType<typeof setTimeout> | undefined

    const needsHistory = () => {
      const c = useChats.getState().chats[chatId]
      return !!c && c.messages.length === 0 && !c.historyLoaded
    }

    async function tick() {
      try {
        const chat = useChats.getState().chats[chatId]
        if (!chat) return
        if (needsHistory()) await loadHistory(api, chatId, signal)
        else if (!document.hidden && hasUnreadOutgoing(chat.messages)) {
          await syncDelivery(api, chatId, signal)
        }
      } catch (e) {
        if (isAbortError(e)) return
      }
      if (!signal.aborted) timer = setTimeout(tick, DELIVERY_POLL_MS)
    }

    void tick()
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [api, chatId])
}
