import { useEffect } from 'react'
import { useChats } from '@/store/chats'
import { useGreenApi } from './useGreenApi'

const GAP_MS = 500

/** Looks up profile photos once per chat, one request at a time (the API is rate limited). */
export function useAvatars() {
  const api = useGreenApi()
  const pending = useChats((s) =>
    Object.values(s.chats)
      .filter((c) => c.avatarUrl === undefined)
      .map((c) => c.chatId)
      .join(','),
  )

  useEffect(() => {
    if (!pending) return
    const controller = new AbortController()
    ;(async () => {
      for (const chatId of pending.split(',')) {
        if (controller.signal.aborted) return
        let url = ''
        try {
          url = await api.getAvatar(chatId, controller.signal)
        } catch {
          if (controller.signal.aborted) return
        }
        useChats.getState().setAvatar(chatId, url)
        await new Promise((r) => setTimeout(r, GAP_MS))
      }
    })()
    return () => controller.abort()
  }, [api, pending])
}
