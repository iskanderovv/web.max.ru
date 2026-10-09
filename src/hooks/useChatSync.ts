import { useEffect } from 'react'
import { isAbortError } from '@/api/errors'
import { hasUnreadOutgoing, loadHistory, syncDelivery } from '@/lib/sync'
import { useChats } from '@/store/chats'
import { useGreenApi } from './useGreenApi'

const DELIVERY_POLL_MS = 20_000

/**
 * For the open chat: loads server history once (fresh chats only) and polls delivery marks
 * while visible and while some sent message is not read yet.
 */
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
        // Best effort: marks are cosmetic, retry on the next tick.
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
