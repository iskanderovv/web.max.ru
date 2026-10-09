import { useCallback, useRef } from 'react'
import { useGreenApi } from '@/features/auth/hooks/useGreenApi'

const TYPING_THROTTLE_MS = 3000
const TYPING_DURATION_MS = 2000

export function useTyping(chatId: string) {
  const api = useGreenApi()
  const last = useRef(0)

  return useCallback(() => {
    if (chatId.startsWith('-')) return
    const now = Date.now()
    if (now - last.current < TYPING_THROTTLE_MS) return
    last.current = now
    api.sendTyping(chatId, TYPING_DURATION_MS).catch(() => {})
  }, [api, chatId])
}
