import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { THEME_FADE_MS, THEME_STORAGE_KEY, applyTheme, systemTheme, useTheme } from './theme'

const root = document.documentElement

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  root.removeAttribute('data-theme')
  root.classList.remove('theme-transition')
  useTheme.setState({ theme: 'light' })
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('theme', () => {
  it('toggle switches html[data-theme] and persists the choice', () => {
    useTheme.getState().toggle()
    expect(useTheme.getState().theme).toBe('dark')
    expect(root.dataset.theme).toBe('dark')
    expect(JSON.parse(localStorage.getItem(THEME_STORAGE_KEY)!).state.theme).toBe('dark')
    useTheme.getState().toggle()
    expect(root.dataset.theme).toBe('light')
  })

  it('cross-fades: transition class is on right after toggle and removed after the fade', () => {
    useTheme.getState().toggle()
    expect(root).toHaveClass('theme-transition')
    vi.advanceTimersByTime(THEME_FADE_MS - 1)
    expect(root).toHaveClass('theme-transition')
    vi.advanceTimersByTime(2)
    expect(root).not.toHaveClass('theme-transition')
  })

  it('rapid toggles keep one fade window', () => {
    useTheme.getState().toggle()
    vi.advanceTimersByTime(200)
    useTheme.getState().toggle()
    vi.advanceTimersByTime(200)
    expect(root).toHaveClass('theme-transition')
    vi.advanceTimersByTime(200)
    expect(root).not.toHaveClass('theme-transition')
  })

  it('applyTheme without animation does not add the transition class', () => {
    applyTheme('dark')
    expect(root.dataset.theme).toBe('dark')
    expect(root).not.toHaveClass('theme-transition')
  })

  it('setTheme to the current theme is a no-op', () => {
    useTheme.getState().setTheme('light')
    expect(root).not.toHaveClass('theme-transition')
  })

  it('follows the system preference by default', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('dark') }))
    expect(systemTheme()).toBe('dark')
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    expect(systemTheme()).toBe('light')
  })
})
