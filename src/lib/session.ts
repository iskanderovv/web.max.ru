import { resetQuotaState } from '@/api/quota'
import { useAuth } from '@/store/auth'
import { useAvatarCache } from '@/store/avatars'
import { useChats } from '@/store/chats'

/** Logs out and wipes locally stored conversations. */
export function endSession() {
  useAuth.getState().logout()
  useChats.getState().reset()
  useAvatarCache.getState().reset()
  // Quota and budget belong to the instance that was just logged out.
  resetQuotaState()
}
