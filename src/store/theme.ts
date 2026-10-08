import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'tg-chat-theme'

export const systemTheme = (): Theme =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Sets `<html data-theme>`. With `animate`, the browser cross-fades the old and new page
 * snapshots (View Transitions); browsers without it, or users who prefer reduced motion,
 * get an instant switch.
 */
export function applyTheme(theme: Theme, animate = false) {
  const root = document.documentElement
  const set = () => {
    root.dataset.theme = theme
  }
  if (animate && !prefersReducedMotion() && typeof document.startViewTransition === 'function') {
    document.startViewTransition(set)
    return
  }
  set()
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
