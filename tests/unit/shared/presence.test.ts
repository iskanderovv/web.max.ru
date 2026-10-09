import { describe, expect, it } from 'vitest'
import { presenceText } from '@/shared/lib/presence'

const NOW = new Date(2026, 9, 8, 15, 0, 0).getTime()
const sec = (y: number, m: number, d: number, h: number, min: number) =>
  Math.floor(new Date(y, m - 1, d, h, min).getTime() / 1000)

describe('presenceText', () => {
  it('hidden last seen (0 or missing) is "recently"', () => {
    expect(presenceText(0, NOW)).toBe('last seen recently')
    expect(presenceText(undefined, NOW)).toBe('last seen recently')
  })

  it('fresh timestamps mean online', () => {
    const now = Math.floor(NOW / 1000)
    expect(presenceText(now - 20, NOW)).toBe('online')
    expect(presenceText(now + 5, NOW)).toBe('online')
  })

  it('formats today, yesterday and older', () => {
    expect(presenceText(sec(2026, 10, 8, 9, 5), NOW)).toBe('last seen today at 09:05')
    expect(presenceText(sec(2026, 10, 7, 23, 40), NOW)).toBe('last seen yesterday at 23:40')
    expect(presenceText(sec(2026, 9, 20, 12, 0), NOW)).toBe('last seen Sep 20')
    expect(presenceText(sec(2025, 9, 20, 12, 0), NOW)).toBe('last seen Sep 20, 2025')
  })
})
