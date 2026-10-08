import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { THEME_STORAGE_KEY, applyTheme, systemTheme, useTheme } from './theme'

const root = document.documentElement
type VT = { startViewTransition?: (cb: () => void) => unknown }
const doc = document as unknown as VT

function mockViewTransition() {
  const start = vi.fn((cb: () => void) => {
    cb()
    return { finished: Promise.resolve() }
  })
  doc.startViewTransition = start
  return start
}

beforeEach(() => {
  localStorage.clear()
  root.removeAttribute('data-theme')
  delete doc.startViewTransition
  useTheme.setState({ theme: 'light' })
})
afterEach(() => {
  delete doc.startViewTransition
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

  it('animates through a single view transition and changes the theme inside it', () => {
    const start = mockViewTransition()
    useTheme.getState().toggle()
    expect(start).toHaveBeenCalledTimes(1)
    expect(root.dataset.theme).toBe('dark')
  })

  it('does not put per-element transition classes on the root', () => {
    mockViewTransition()
    useTheme.getState().toggle()
    expect(root.className).toBe('')
  })

  it('switches instantly where View Transitions are unsupported', () => {
    useTheme.getState().toggle()
    expect(root.dataset.theme).toBe('dark')
  })

  it('switches instantly for users who prefer reduced motion', () => {
    const start = mockViewTransition()
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce') }))
    applyTheme('dark', true)
    expect(start).not.toHaveBeenCalled()
    expect(root.dataset.theme).toBe('dark')
  })

  it('applyTheme without animation never starts a transition (initial load)', () => {
    const start = mockViewTransition()
    applyTheme('dark')
    expect(start).not.toHaveBeenCalled()
    expect(root.dataset.theme).toBe('dark')
  })

  it('setTheme to the current theme is a no-op', () => {
    const start = mockViewTransition()
    useTheme.getState().setTheme('light')
    expect(start).not.toHaveBeenCalled()
  })

  it('follows the system preference by default', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('dark') }))
    expect(systemTheme()).toBe('dark')
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    expect(systemTheme()).toBe('light')
  })
})
