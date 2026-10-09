import { useQuery } from '@tanstack/react-query'
import { presenceText } from '@/lib/presence'
import { useGreenApi } from './useGreenApi'

/** Presence line for a contact row. Same cache key as the chat header, so lookups are shared. */
export function useContactPresence(chatId: string, enabled: boolean) {
  const api = useGreenApi()
  const info = useQuery({
    queryKey: ['contactInfo', chatId],
    queryFn: ({ signal }) => api.getContactInfo(chatId, signal),
    enabled,
    staleTime: 60_000,
    retry: false,
  })
  return { text: info.data ? presenceText(info.data.lastSeen) : null, failed: info.isError }
}
