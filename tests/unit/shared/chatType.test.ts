import { describe, expect, it } from 'vitest'
import { isGroupLike, typeLabel } from '@/shared/lib/chatType'

describe('labels', () => {
  it('maps types', () => {
    expect(typeLabel('bot')).toBe('bot')
    expect(typeLabel('supergroup')).toBe('group')
    expect(typeLabel('user')).toBe('')
    expect(isGroupLike('channel')).toBe(true)
    expect(isGroupLike('bot')).toBe(false)
  })
})
