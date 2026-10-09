import { beforeEach, describe, expect, it } from 'vitest'
import incoming from '../../fixtures/receive-incoming-text.json'
import other from '../../fixtures/receive-other-type.json'
import { useChats } from '@/store/chats'
import { applyNotification } from './incoming'

beforeEach(() => {
  localStorage.clear()
  useChats.getState().reset()
})

describe('applyNotification', () => {
  it('adds incoming text to an existing chat', () => {
    useChats.getState().ensureChat({ chatId: '10000000', title: '@vasilisa' })
    expect(applyNotification(incoming.body)).toBe(true)
    const chat = useChats.getState().chats['10000000']
    expect(chat.title).toBe('@vasilisa')
    expect(chat.unread).toBe(1)
    expect(chat.messages[0]).toMatchObject({
      id: '126543123451133331119',
      text: 'Hello from Green-API!',
      direction: 'in',
    })
  })

  it('ignores the same message delivered twice', () => {
    useChats.getState().ensureChat({ chatId: '10000000', title: 'V' })
    expect(applyNotification(incoming.body)).toBe(true)
    expect(applyNotification(incoming.body)).toBe(false)
    expect(useChats.getState().chats['10000000'].messages).toHaveLength(1)
  })

  it('ignores chats the user never opened', () => {
    expect(applyNotification(incoming.body)).toBe(false)
    expect(useChats.getState().chats).toEqual({})
  })

  it('ignores non-text notifications', () => {
    useChats.getState().ensureChat({ chatId: '10000000', title: 'V' })
    expect(applyNotification(other.body)).toBe(false)
  })
})

describe('outgoing message status notifications', () => {
  const status = (s: string, idMessage = 'out-1', chatId = '10000000') => ({
    typeWebhook: 'outgoingMessageStatus',
    chatId,
    idMessage,
    status: s,
    timestamp: 1,
    instanceData: { idInstance: 1, wid: 'x', typeInstance: 'telegram' },
  })
  const setup = (msgStatus: 'sent' | 'delivered' = 'sent') => {
    useChats.getState().ensureChat({ chatId: '10000000', title: 'V' })
    useChats.getState().addMessage('10000000', {
      id: 'out-1',
      text: 'hi',
      direction: 'out',
      timestamp: 1,
      status: msgStatus,
    })
  }
  const current = () => useChats.getState().chats['10000000'].messages[0].status

  it('read upgrades the mark', () => {
    setup()
    expect(applyNotification(status('read'))).toBe(true)
    expect(current()).toBe('read')
  })

  it('delivered upgrades sent and never downgrades read', () => {
    setup()
    applyNotification(status('delivered'))
    expect(current()).toBe('delivered')
    applyNotification(status('read'))
    applyNotification(status('delivered'))
    expect(current()).toBe('read')
  })

  it.each(['failed', 'noAccount'])('%s marks the message as failed', (s) => {
    setup()
    expect(applyNotification(status(s))).toBe(true)
    expect(current()).toBe('failed')
  })

  it('ignores unknown messages, unknown chats and unknown statuses', () => {
    setup()
    expect(applyNotification(status('read', 'other-id'))).toBe(false)
    expect(applyNotification(status('read', 'out-1', '999'))).toBe(false)
    expect(applyNotification(status('weird'))).toBe(false)
    expect(current()).toBe('sent')
  })

  it('does not touch incoming messages with the same id', () => {
    useChats.getState().ensureChat({ chatId: '10000000', title: 'V' })
    useChats.getState().addMessage('10000000', {
      id: 'out-1',
      text: 'theirs',
      direction: 'in',
      timestamp: 1,
      status: 'sent',
    })
    expect(applyNotification(status('read'))).toBe(false)
  })
})
