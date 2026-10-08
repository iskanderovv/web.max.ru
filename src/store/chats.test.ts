import { beforeEach, describe, expect, it } from 'vitest'
import { MAX_MESSAGES_PER_CHAT, selectSortedChats, useChats, type ChatMessage } from './chats'

const msg = (id: string, over: Partial<ChatMessage> = {}): ChatMessage => ({
  id,
  text: id,
  direction: 'in',
  timestamp: 100,
  status: 'sent',
  ...over,
})

beforeEach(() => {
  localStorage.clear()
  useChats.getState().reset()
})

describe('chats store', () => {
  it('ensureChat creates once and keeps messages', () => {
    const s = useChats.getState()
    s.ensureChat({ chatId: '1', title: 'A' })
    s.addMessage('1', msg('m1'))
    s.ensureChat({ chatId: '1', title: 'A2', username: '@a' })
    const chat = useChats.getState().chats['1']
    expect(chat.title).toBe('A2')
    expect(chat.username).toBe('@a')
    expect(chat.messages).toHaveLength(1)
  })

  it('dedups messages by id', () => {
    const s = useChats.getState()
    s.ensureChat({ chatId: '1', title: 'A' })
    expect(s.addMessage('1', msg('m1'))).toBe(true)
    expect(s.addMessage('1', msg('m1'))).toBe(false)
    expect(useChats.getState().chats['1'].messages).toHaveLength(1)
  })

  it('ignores messages for unknown chats', () => {
    expect(useChats.getState().addMessage('nope', msg('m1'))).toBe(false)
  })

  it('counts unread only for incoming messages in inactive chats; selecting clears', () => {
    const s = useChats.getState()
    s.ensureChat({ chatId: '1', title: 'A' })
    s.addMessage('1', msg('m1'))
    s.addMessage('1', msg('m2', { direction: 'out' }))
    expect(useChats.getState().chats['1'].unread).toBe(1)
    s.selectChat('1')
    expect(useChats.getState().chats['1'].unread).toBe(0)
    s.addMessage('1', msg('m3'))
    expect(useChats.getState().chats['1'].unread).toBe(0)
  })

  it('caps stored messages', () => {
    const s = useChats.getState()
    s.ensureChat({ chatId: '1', title: 'A' })
    for (let i = 0; i < MAX_MESSAGES_PER_CHAT + 5; i++) s.addMessage('1', msg(`m${i}`))
    const messages = useChats.getState().chats['1'].messages
    expect(messages).toHaveLength(MAX_MESSAGES_PER_CHAT)
    expect(messages[0].id).toBe('m5')
  })

  it('sorts by last activity, newest first', () => {
    const s = useChats.getState()
    s.ensureChat({ chatId: '1', title: 'A' })
    s.ensureChat({ chatId: '2', title: 'B' })
    s.addMessage('1', msg('a', { timestamp: 2000 }))
    s.addMessage('2', msg('b', { timestamp: 3000 }))
    expect(selectSortedChats(useChats.getState()).map((c) => c.chatId)).toEqual(['2', '1'])
  })

  it('updateMessage patches status', () => {
    const s = useChats.getState()
    s.ensureChat({ chatId: '1', title: 'A' })
    s.addMessage('1', msg('m1', { status: 'sending' }))
    s.updateMessage('1', 'm1', { status: 'failed' })
    expect(useChats.getState().chats['1'].messages[0].status).toBe('failed')
  })
})
