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

describe('chat management', () => {
  it('deleteChat removes it and clears the active selection', () => {
    const s = useChats.getState()
    s.ensureChat({ chatId: '1', title: 'A' })
    s.ensureChat({ chatId: '2', title: 'B' })
    s.selectChat('1')
    s.deleteChat('1')
    expect(Object.keys(useChats.getState().chats)).toEqual(['2'])
    expect(useChats.getState().activeChatId).toBeNull()
  })

  it('deleteChat keeps the selection when another chat is removed', () => {
    const s = useChats.getState()
    s.ensureChat({ chatId: '1', title: 'A' })
    s.ensureChat({ chatId: '2', title: 'B' })
    s.selectChat('1')
    s.deleteChat('2')
    expect(useChats.getState().activeChatId).toBe('1')
  })

  it('clearHistory empties messages but keeps the chat', () => {
    const s = useChats.getState()
    s.ensureChat({ chatId: '1', title: 'A' })
    s.addMessage('1', msg('m1'))
    s.clearHistory('1')
    const chat = useChats.getState().chats['1']
    expect(chat.messages).toEqual([])
    expect(chat.unread).toBe(0)
  })

  it('importHistory fills only empty chats', () => {
    const s = useChats.getState()
    s.ensureChat({ chatId: '1', title: 'A' })
    s.importHistory('1', [msg('h1', { timestamp: 5 }), msg('h2', { timestamp: 9 })])
    expect(useChats.getState().chats['1'].messages.map((m) => m.id)).toEqual(['h1', 'h2'])
    expect(useChats.getState().chats['1'].updatedAt).toBe(9)
    s.importHistory('1', [msg('h3')])
    expect(useChats.getState().chats['1'].messages).toHaveLength(2)
  })

  it('applyDelivery upgrades sent -> delivered -> read and never downgrades', () => {
    const s = useChats.getState()
    s.ensureChat({ chatId: '1', title: 'A' })
    s.addMessage('1', msg('o1', { direction: 'out', status: 'sent' }))
    s.addMessage('1', msg('o2', { direction: 'out', status: 'sending' }))
    s.addMessage('1', msg('i1', { direction: 'in' }))
    const status = (id: string) =>
      useChats.getState().chats['1'].messages.find((m) => m.id === id)?.status
    s.applyDelivery('1', { o1: 'delivered', o2: 'read', i1: 'read' })
    expect(status('o1')).toBe('delivered')
    expect(status('o2')).toBe('sending')
    expect(status('i1')).toBe('sent')
    s.applyDelivery('1', { o1: 'read' })
    expect(status('o1')).toBe('read')
    s.applyDelivery('1', { o1: 'delivered' })
    expect(status('o1')).toBe('read')
  })
})

describe('message edit/delete', () => {
  it('deleteMessage removes only that message', () => {
    const s = useChats.getState()
    s.ensureChat({ chatId: '1', title: 'A' })
    s.addMessage('1', msg('m1'))
    s.addMessage('1', msg('m2'))
    s.deleteMessage('1', 'm1')
    expect(useChats.getState().chats['1'].messages.map((m) => m.id)).toEqual(['m2'])
  })

  it('editMessageText changes text and flags it edited', () => {
    const s = useChats.getState()
    s.ensureChat({ chatId: '1', title: 'A' })
    s.addMessage('1', msg('m1', { direction: 'out' }))
    s.editMessageText('1', 'm1', 'new')
    expect(useChats.getState().chats['1'].messages[0]).toMatchObject({ text: 'new', edited: true })
  })
})
