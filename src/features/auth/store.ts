import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Credentials } from '@/api/schemas'

interface AuthState {
  credentials: Credentials | null
  login: (credentials: Credentials) => void
  logout: () => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      credentials: null,
      login: (credentials) => set({ credentials }),
      logout: () => set({ credentials: null }),
    }),
    { name: 'tg-chat-auth' },
  ),
)
