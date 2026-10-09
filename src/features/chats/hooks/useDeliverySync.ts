import { useEffect } from 'react'
import type { GreenApi } from '@/api/green'
import { syncDelivery } from '@/features/chats/lib/sync'
import { useChats } from '@/features/chats/store'
import { useGreenApi } from '@/features/auth/hooks/useGreenApi'

export const BACKGROUND_SYNC_MS = 60_000
const MAX_CHATS_PER_PASS = 2

export function chatsAwaitingRead(activeChatId: string | null, limit = MAX_CHATS_PER_PASS) {
  return Object.values(useChats.getState().chats)
    .filter((c) => {
      const last = c.messages.at(-1)
      return (
        c.chatId !== activeChatId &&
        last?.direction === 'out' &&
        (last.status === 'sent' || last.status === 'delivered')
      )
    })
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit)
    .map((c) => c.chatId)
}

export async function syncAwaitingChats(
  api: GreenApi,
  activeChatId: string | null,
  signal?: AbortSignal,
) {
  for (const chatId of chatsAwaitingRead(activeChatId)) {
    if (signal?.aborted) return
    try {
      await syncDelivery(api, chatId, signal)
    } catch {}
  }
}

export function useDeliverySync() {
  const api = useGreenApi()

  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>

    async function pass() {
      if (!document.hidden) {
        await syncAwaitingChats(api, useChats.getState().activeChatId, controller.signal)
      }
      if (!controller.signal.aborted) timer = setTimeout(pass, BACKGROUND_SYNC_MS)
    }
    timer = setTimeout(pass, BACKGROUND_SYNC_MS)

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [api])
}
