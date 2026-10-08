import { describe, expect, it } from 'vitest'
import { dayLabel, formatListTime, formatTime } from './time'

const at = (y: number, m: number, d: number, h = 12, min = 5) =>
  Math.floor(new Date(y, m - 1, d, h, min).getTime() / 1000)

describe('time helpers', () => {
  const now = new Date(2026, 9, 8, 15, 0).getTime()

  it('formats HH:MM with padding', () => {
    expect(formatTime(at(2026, 10, 8, 9, 3))).toBe('09:03')
  })

  it('labels today, yesterday and older dates', () => {
    expect(dayLabel(at(2026, 10, 8), now)).toBe('Today')
    expect(dayLabel(at(2026, 10, 7), now)).toBe('Yesterday')
    expect(dayLabel(at(2026, 9, 1), now)).toBe('September 1')
    expect(dayLabel(at(2025, 9, 1), now)).toBe('September 1, 2025')
  })

  it('list time: clock today, short date otherwise', () => {
    expect(formatListTime(at(2026, 10, 8, 14, 30), now)).toBe('14:30')
    expect(formatListTime(at(2026, 10, 1), now)).toBe('Oct 1')
  })
})
