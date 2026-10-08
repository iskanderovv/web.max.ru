import { useEffect } from 'react'
import type { GreenApi } from '@/api/green'
import { syncDelivery } from '@/lib/sync'
import { useChats } from '@/store/chats'
import { useGreenApi } from './useGreenApi'

export const BACKGROUND_SYNC_MS = 12_000
const MAX_CHATS_PER_PASS = 5
const GAP_MS = 300

/** Chats whose latest message is ours and not yet read, newest first (the open chat syncs itself). */
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

/** One pass over the chats awaiting a read mark; errors are ignored (cosmetic). */
export async function syncAwaitingChats(
  api: GreenApi,
  activeChatId: string | null,
  signal?: AbortSignal,
  gapMs = GAP_MS,
) {
  for (const chatId of chatsAwaitingRead(activeChatId)) {
    if (signal?.aborted) return
    try {
      await syncDelivery(api, chatId, signal)
    } catch {
      /* try again next pass */
    }
    await new Promise((r) => setTimeout(r, gapMs))
  }
}

/** Keeps the ✓ / ✓✓ marks in the chat list fresh for chats that are not open. */
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
