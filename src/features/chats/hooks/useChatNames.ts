import { useEffect } from 'react'
import { isHandleLike, realNameOf } from '@/shared/lib/names'
import { useChats } from '@/features/chats/store'
import { useGreenApi } from '@/features/auth/hooks/useGreenApi'

export function useChatNames() {
  const api = useGreenApi()
  const pending = useChats((s) =>
    Object.values(s.chats)
      .filter(
        (c) =>
          !c.titleChecked && isHandleLike(c.title) && (c.type === undefined || c.type === 'user'),
      )
      .map((c) => c.chatId)
      .join(','),
  )

  useEffect(() => {
    if (!pending) return
    const controller = new AbortController()
    ;(async () => {
      for (const chatId of pending.split(',')) {
        if (controller.signal.aborted) return
        let name = ''
        try {
          name = realNameOf(await api.getContactInfo(chatId, controller.signal))
        } catch {
          if (controller.signal.aborted) return
        }
        useChats.getState().resolveTitle(chatId, name || undefined)
      }
    })()
    return () => controller.abort()
  }, [api, pending])
}
