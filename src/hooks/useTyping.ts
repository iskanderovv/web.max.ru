import { useCallback, useRef } from 'react'
import { useGreenApi } from './useGreenApi'

const TYPING_THROTTLE_MS = 3000
const TYPING_DURATION_MS = 2000

/** Tells the recipient we are typing; at most one request per throttle window, best effort. */
export function useTyping(chatId: string) {
  const api = useGreenApi()
  const last = useRef(0)

  return useCallback(() => {
    // Groups have negative ids; indicators there are noise.
    if (chatId.startsWith('-')) return
    const now = Date.now()
    if (now - last.current < TYPING_THROTTLE_MS) return
    last.current = now
    api.sendTyping(chatId, TYPING_DURATION_MS).catch(() => {})
  }, [api, chatId])
}
