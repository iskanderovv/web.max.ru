import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, vi } from 'vitest'
import { resetQuotaState } from '@/api/quota'
import { configureScheduler } from '@/api/scheduler'
import { useAuth } from '@/features/auth/store'
import { useChats } from '@/features/chats/store'
import { useAvatarCache } from '@/shared/store/avatars'

configureScheduler({ gapMs: 0, methodGapMs: {}, retryBaseMs: 1 })

beforeEach(() => {
  localStorage.clear()
  resetQuotaState()
  useAuth.setState({ credentials: null })
  useChats.getState().reset()
  useAvatarCache.getState().reset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})
