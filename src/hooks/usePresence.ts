import { useQuery } from '@tanstack/react-query'
import type { ChatType } from '@/api/schemas'
import { presenceText } from '@/lib/presence'
import { useGreenApi } from './useGreenApi'

/**
 * `getContactInfo` is metered (100 calls/month on the free plan), so presence is looked up
 * once when a chat is opened and then served from cache: no polling.
 */
export const PRESENCE_STALE_MS = 10 * 60_000

/** Presence line for a private chat. `null` = not applicable, unknown, or the quota is used up. */
export function usePresence(chatId: string, type: ChatType | undefined) {
  const api = useGreenApi()
  const applicable = type === undefined || type === 'user'
  const info = useQuery({
    queryKey: ['contactInfo', chatId],
    queryFn: ({ signal }) => api.getContactInfo(chatId, signal),
    enabled: applicable,
    staleTime: PRESENCE_STALE_MS,
    refetchOnWindowFocus: false,
    retry: false,
  })
  if (!applicable || !info.data) return null
  return presenceText(info.data.lastSeen)
}
