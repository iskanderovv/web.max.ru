import { useQuery } from '@tanstack/react-query'
import type { ChatType } from '@/api/schemas'
import { presenceText } from '@/shared/lib/presence'
import { useGreenApi } from '@/features/auth/hooks/useGreenApi'

const PRESENCE_STALE_MS = 10 * 60_000

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
