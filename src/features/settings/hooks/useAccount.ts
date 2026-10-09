import { useQuery } from '@tanstack/react-query'
import { useGreenApi } from '@/features/auth/hooks/useGreenApi'

export interface Account {
  chatId?: string
  phone: string | null
  username: string | null
  avatarUrl: string
}

export function useAccount(enabled = true): Account | undefined {
  const api = useGreenApi()
  const settings = useQuery({
    queryKey: ['account'],
    queryFn: ({ signal }) => api.getAccountSettings(signal),
    staleTime: Infinity,
    enabled,
    retry: false,
  })

  if (!settings.data) return undefined
  const { chatId, phone, username, avatar } = settings.data
  return {
    chatId,
    phone: phone ? `+${phone.replace(/^\+/, '')}` : null,
    username: username || null,
    avatarUrl: avatar || '',
  }
}
