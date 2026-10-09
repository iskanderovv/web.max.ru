import { useQuery } from '@tanstack/react-query'
import { useGreenApi } from './useGreenApi'

export interface Account {
  chatId?: string
  phone: string | null
  username: string | null
  avatarUrl: string
}

/** The logged-in Telegram account: photo, phone and username (no metered display-name lookup). */
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
