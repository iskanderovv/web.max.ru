import { useQuery } from '@tanstack/react-query'
import { presenceText } from '@/lib/presence'
import type { ChatType } from '@/api/schemas'
import { useGreenApi } from './useGreenApi'

export const PRESENCE_POLL_MS = 30_000

/** Presence line for a private chat: polled while the tab is visible. `null` = not applicable/unknown. */
export function usePresence(chatId: string, type: ChatType | undefined) {
  const api = useGreenApi()
  const applicable = type === undefined || type === 'user'
  const info = useQuery({
    queryKey: ['contactInfo', chatId],
    queryFn: ({ signal }) => api.getContactInfo(chatId, signal),
    enabled: applicable,
    refetchInterval: PRESENCE_POLL_MS,
    refetchIntervalInBackground: false,
    staleTime: PRESENCE_POLL_MS / 2,
    retry: false,
  })
  if (!applicable || !info.data) return null
  return presenceText(info.data.lastSeen)
}
