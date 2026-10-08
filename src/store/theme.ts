import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'tg-chat-theme'
export const THEME_FADE_MS = 350

export const systemTheme = (): Theme =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'

let fadeTimer: ReturnType<typeof setTimeout> | undefined

/** Sets `<html data-theme>`; with `animate` the colors cross-fade instead of snapping. */
export function applyTheme(theme: Theme, animate = false) {
  const root = document.documentElement
  if (animate) {
    root.classList.add('theme-transition')
    clearTimeout(fadeTimer)
    fadeTimer = setTimeout(() => root.classList.remove('theme-transition'), THEME_FADE_MS)
  }
  root.dataset.theme = theme
}

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggle: () => void
}

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: systemTheme(),
      setTheme: (theme) => {
        if (theme === get().theme) return
        applyTheme(theme, true)
        set({ theme })
      },
      toggle: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
    }),
    {
      name: THEME_STORAGE_KEY,
      partialize: (s) => ({ theme: s.theme }),
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme)
      },
    },
  ),
)
