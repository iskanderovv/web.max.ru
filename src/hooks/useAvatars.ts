import { useEffect } from 'react'
import { useAvatarCache } from '@/store/avatars'
import { useChats } from '@/store/chats'
import { useGreenApi } from './useGreenApi'

/** Looks up profile photos once per chat, one at a time (requests are also spaced by the scheduler). */
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
        let url = useAvatarCache.getState().urls[chatId] ?? ''
        if (useAvatarCache.getState().urls[chatId] === undefined) {
          try {
            url = await api.getAvatar(chatId, controller.signal)
            useAvatarCache.getState().set(chatId, url)
          } catch {
            if (controller.signal.aborted) return
          }
        }
        useChats.getState().setAvatar(chatId, url)
      }
    })()
    return () => controller.abort()
  }, [api, pending])
}
