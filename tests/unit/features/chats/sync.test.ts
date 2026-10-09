import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GreenApi } from '@/api/green'
import { parseHistory } from '@/api/schemas'
import { useChats } from '@/features/chats/store'
import { hasUnreadOutgoing, loadHistory, syncDelivery } from '@/features/chats/lib/sync'

const rows = [
  {
    type: 'incoming',
    idMessage: 'a',
    timestamp: 10,
    typeMessage: 'textMessage',
    textMessage: 'hi',
  },
  {
    type: 'outgoing',
    idMessage: 'b',
    timestamp: 20,
    typeMessage: 'textMessage',
    textMessage: 'yo',
    statusMessage: 'read',
  },
  { type: 'outgoing', idMessage: 'c', timestamp: 5, typeMessage: 'imageMessage' },
  { nonsense: true },
]
const fakeApi = (history = parseHistory(rows)) =>
  ({ getChatHistory: vi.fn().mockResolvedValue(history) }) as unknown as GreenApi

beforeEach(() => {
  localStorage.clear()
  useChats.getState().reset()
  useChats.getState().ensureChat({ chatId: '1', title: 'A' })
})

describe('parseHistory', () => {
  it('keeps sorted text messages, skips media and malformed rows', () => {
    expect(parseHistory(rows)).toEqual([
      { id: 'a', direction: 'in', text: 'hi', timestamp: 10, delivery: undefined },
      { id: 'b', direction: 'out', text: 'yo', timestamp: 20, delivery: 'read' },
    ])
    expect(parseHistory(null)).toEqual([])
  })
})

describe('sync', () => {
  it('loadHistory imports into an empty chat with statuses', async () => {
    await loadHistory(fakeApi(), '1')
    const [a, b] = useChats.getState().chats['1'].messages
    expect(a).toMatchObject({ id: 'a', direction: 'in', status: 'sent' })
    expect(b).toMatchObject({ id: 'b', direction: 'out', status: 'read' })
  })

  it('syncDelivery marks known outgoing messages as read', async () => {
    useChats
      .getState()
      .addMessage('1', { id: 'b', text: 'yo', direction: 'out', timestamp: 20, status: 'sent' })
    await syncDelivery(fakeApi(), '1')
    expect(useChats.getState().chats['1'].messages[0].status).toBe('read')
  })

  it('hasUnreadOutgoing detects pending marks', () => {
    const m = (status: 'sent' | 'read' | 'sending', direction: 'in' | 'out' = 'out') => ({
      id: status + direction,
      text: '',
      direction,
      timestamp: 1,
      status,
    })
    expect(hasUnreadOutgoing([m('sent')])).toBe(true)
    expect(hasUnreadOutgoing([m('read'), m('sent', 'in')])).toBe(false)
    expect(hasUnreadOutgoing([m('sending')])).toBe(false)
  })
})
