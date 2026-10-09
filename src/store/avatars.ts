import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AvatarState {
  /** chatId -> photo URL; `''` means "looked up, none/hidden". Missing = never looked up. */
  urls: Record<string, string>
  set: (chatId: string, url: string) => void
  reset: () => void
}

/** Profile photos shared by chat rows and the contacts list: each person costs one lookup, ever. */
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
