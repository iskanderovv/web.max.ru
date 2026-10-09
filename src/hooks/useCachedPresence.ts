import { useQuery } from '@tanstack/react-query'
import { presenceText } from '@/lib/presence'
import { useGreenApi } from './useGreenApi'

/**
 * Presence of a contact row from the shared cache only. It never fetches: `getContactInfo` is
 * metered (100 calls/month on the free plan), so a list must not trigger a call per row.
 * Statuses appear for contacts whose chat was opened (that lookup fills the cache).
 */
export function useCachedPresence(chatId: string): string | null {
  const api = useGreenApi()
  const info = useQuery({
    queryKey: ['contactInfo', chatId],
    queryFn: ({ signal }) => api.getContactInfo(chatId, signal),
    enabled: false,
  })
  return info.data ? presenceText(info.data.lastSeen) : null
}
