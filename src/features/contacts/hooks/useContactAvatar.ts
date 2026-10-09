import { useEffect } from 'react'
import { budgetLeft, spendBudget } from '@/api/quota'
import { useAvatarCache } from '@/shared/store/avatars'
import { useGreenApi } from '@/features/auth/hooks/useGreenApi'

export const AVATAR_MONTHLY_BUDGET = 60

const inFlight = new Set<string>()

export function useContactAvatar(chatId: string, wanted: boolean): string | undefined {
  const api = useGreenApi()
  const cached = useAvatarCache((s) => s.urls[chatId])

  useEffect(() => {
    if (!wanted || cached !== undefined || inFlight.has(chatId)) return
    if (budgetLeft('avatar', AVATAR_MONTHLY_BUDGET) <= 0) return
    const controller = new AbortController()
    inFlight.add(chatId)
    spendBudget('avatar')
    api
      .getAvatar(chatId, controller.signal)
      .then((url) => useAvatarCache.getState().set(chatId, url))
      .catch(() => {})
      .finally(() => inFlight.delete(chatId))
    return () => controller.abort()
  }, [api, chatId, wanted, cached])

  return cached || undefined
}
