import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AvatarState {
  urls: Record<string, string>
  set: (chatId: string, url: string) => void
  reset: () => void
}

export const useAvatarCache = create<AvatarState>()(
  persist(
    (set) => ({
      urls: {},
      set: (chatId, url) => set((s) => ({ urls: { ...s.urls, [chatId]: url } })),
      reset: () => set({ urls: {} }),
    }),
    { name: 'tg-chat-avatars' },
  ),
)
