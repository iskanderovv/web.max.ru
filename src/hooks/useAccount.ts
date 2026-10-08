import { useQuery } from '@tanstack/react-query'
import { realNameOf } from '@/lib/names'
import { useGreenApi } from './useGreenApi'

export interface Account {
  chatId?: string
  name: string
  phone: string | null
  username: string | null
  avatarUrl: string
}

/** The logged-in Telegram account: photo, name, phone and username. */
export function useAccount(enabled = true): Account | undefined {
  const api = useGreenApi()
  const settings = useQuery({
    queryKey: ['account'],
    queryFn: ({ signal }) => api.getAccountSettings(signal),
    staleTime: Infinity,
    enabled,
    retry: false,
  })
  const chatId = settings.data?.chatId
  // The account settings carry no display name: take it from our own contact card.
  const card = useQuery({
    queryKey: ['contactInfo', chatId],
    queryFn: ({ signal }) => api.getContactInfo(chatId!, signal),
    staleTime: 5 * 60_000,
    enabled: enabled && !!chatId,
    retry: false,
  })

  if (!settings.data) return undefined
  const { phone, username, avatar } = settings.data
  return {
    chatId,
    name: realNameOf(card.data),
    phone: phone ? `+${phone.replace(/^\+/, '')}` : null,
    username: username || null,
    avatarUrl: avatar || '',
  }
}
