import { useQuery } from '@tanstack/react-query'
import { presenceText } from '@/shared/lib/presence'
import { useGreenApi } from '@/features/auth/hooks/useGreenApi'

export function useCachedPresence(chatId: string): string | null {
  const api = useGreenApi()
  const info = useQuery({
    queryKey: ['contactInfo', chatId],
    queryFn: ({ signal }) => api.getContactInfo(chatId, signal),
    enabled: false,
  })
  return info.data ? presenceText(info.data.lastSeen) : null
}
