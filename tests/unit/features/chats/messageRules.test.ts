import { describe, expect, it } from 'vitest'
import type { ChatMessage } from '@/features/chats/store'
import { EDIT_WINDOW_SEC, canDeleteRemotely, canEdit } from '@/features/chats/lib/messageRules'

const NOW = 1_800_000_000
const m = (over: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'srv-1',
  text: 't',
  direction: 'out',
  timestamp: NOW - 60,
  status: 'sent',
  ...over,
})

describe('messageRules', () => {
  it('allows editing recent delivered own messages', () => {
    expect(canEdit(m(), NOW)).toBe(true)
    expect(canEdit(m({ status: 'read' }), NOW)).toBe(true)
  })

  it.each([
    ['incoming', { direction: 'in' as const }],
    ['still sending', { status: 'sending' as const }],
    ['failed', { status: 'failed' as const }],
    ['local id', { id: 'local-1' }],
    ['older than 48h', { timestamp: NOW - EDIT_WINDOW_SEC - 1 }],
  ])('forbids editing: %s', (_name, over) => {
    expect(canEdit(m(over), NOW)).toBe(false)
  })

  it('remote delete only for delivered own messages', () => {
    expect(canDeleteRemotely(m())).toBe(true)
    expect(canDeleteRemotely(m({ direction: 'in' }))).toBe(false)
    expect(canDeleteRemotely(m({ id: 'local-2', status: 'failed' }))).toBe(false)
  })
})
