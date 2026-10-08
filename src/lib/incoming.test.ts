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
