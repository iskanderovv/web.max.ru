import { resetQuotaState } from '@/api/quota'
import { useAuth } from '@/features/auth/store'
import { useAvatarCache } from '@/shared/store/avatars'
import { useChats } from '@/features/chats/store'

export function endSession() {
  useAuth.getState().logout()
  useChats.getState().reset()
  useAvatarCache.getState().reset()
  resetQuotaState()
}
