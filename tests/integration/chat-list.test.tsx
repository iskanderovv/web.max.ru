import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useChats } from '@/features/chats/store'
import { fakeFetch } from '@tests/helpers/fakeFetch'
import { bodyOf, logIn, renderApp } from '@tests/helpers/app'

describe('status marks in the chat list', () => {
  const NOWT = () => Math.floor(Date.now() / 1000)
  const addChat = (
    chatId: string,
    title: string,
    last: {
      direction: 'in' | 'out'
      status: import('@/features/chats/store').MessageStatus
      text?: string
    },
    type?: 'user' | 'supergroup',
  ) => {
    useChats.getState().ensureChat({ chatId, title, type })
    useChats.getState().addMessage(chatId, {
      id: `m-${chatId}`,
      text: last.text ?? `text ${chatId}`,
      direction: last.direction,
      timestamp: NOWT(),
      status: last.status,
    })
  }
  const rowOf = (title: string) => screen.getByText(title).closest('button') as HTMLElement
  const marks = (row: HTMLElement) =>
    [...row.querySelectorAll('[data-status]')].map((n) => n.getAttribute('data-status'))

  it('shows the right mark for the last outgoing message of each chat', () => {
    logIn()
    addChat('1', 'Read Chat', { direction: 'out', status: 'read' })
    addChat('2', 'Sent Chat', { direction: 'out', status: 'sent' })
    addChat('3', 'Delivered Chat', { direction: 'out', status: 'delivered' })
    addChat('4', 'Sending Chat', { direction: 'out', status: 'sending' })
    addChat('5', 'Failed Chat', { direction: 'out', status: 'failed' })
    fakeFetch()
    renderApp()
    expect(marks(rowOf('Read Chat'))).toEqual(['read'])
    expect(marks(rowOf('Sent Chat'))).toEqual(['sent'])
    expect(marks(rowOf('Delivered Chat'))).toEqual(['delivered'])
    expect(marks(rowOf('Sending Chat'))).toEqual(['sending'])
    expect(marks(rowOf('Failed Chat'))).toEqual(['failed'])
  })

  it('puts the mark next to the time, not before the message text', () => {
    logIn()
    addChat('1', 'Read Chat', { direction: 'out', status: 'read', text: 'hello there' })
    fakeFetch()
    renderApp()
    const icon = rowOf('Read Chat').querySelector('[data-status]')!
    const timeCell = icon.closest('span.shrink-0')!
    expect(timeCell).toHaveTextContent(/^\d{1,2}:\d{2}$|^[A-Z][a-z]{2} \d{1,2}$/)
    expect(within(rowOf('Read Chat')).getByText('hello there').parentElement).not.toContainElement(
      icon as HTMLElement,
    )
  })

  it('shows no mark when the last message is incoming', () => {
    logIn()
    addChat('1', 'Their Chat', { direction: 'in', status: 'sent', text: 'hey' })
    fakeFetch()
    renderApp()
    expect(marks(rowOf('Their Chat'))).toEqual([])
    expect(within(rowOf('Their Chat')).getByText('hey')).toBeInTheDocument()
  })

  it('uses "You:" only in group-like chats, ticks in private chats', () => {
    logIn()
    addChat('1', 'Private One', { direction: 'out', status: 'read', text: 'priv' })
    addChat('-2', 'Group One', { direction: 'out', status: 'sent', text: 'grp' }, 'supergroup')
    fakeFetch()
    renderApp()
    expect(within(rowOf('Private One')).getByText('priv')).toBeInTheDocument()
    expect(within(rowOf('Group One')).getByText('You: grp')).toBeInTheDocument()
  })

  it('background sync upgrades the mark of a chat that is not open', async () => {
    const { syncAwaitingChats } = await import('@/features/chats/hooks/useDeliverySync')
    const { createGreenApi } = await import('@/api/green')
    logIn()
    addChat('1', 'Quiet Chat', { direction: 'out', status: 'sent', text: 'yo' })
    useChats.getState().updateMessage('1', 'm-1', { id: 'srv-9' })
    const api = fakeFetch({
      getChatHistory: [
        {
          type: 'outgoing',
          idMessage: 'srv-9',
          timestamp: NOWT(),
          typeMessage: 'textMessage',
          textMessage: 'yo',
          statusMessage: 'read',
        },
      ],
    })
    renderApp()
    expect(marks(rowOf('Quiet Chat'))).toEqual(['sent'])
    await syncAwaitingChats(
      createGreenApi({ apiUrl: 'https://x.test', idInstance: '1', apiTokenInstance: 't' }),
      null,
    )
    await waitFor(() => expect(marks(rowOf('Quiet Chat'))).toEqual(['read']))
    expect(bodyOf(api.of('getChatHistory').at(-1)).chatId).toBe('1')
  })

  it('background sync skips the open chat, read chats and chats ending with their message', async () => {
    const { chatsAwaitingRead } = await import('@/features/chats/hooks/useDeliverySync')
    addChat('1', 'Open', { direction: 'out', status: 'sent' })
    addChat('2', 'Waiting', { direction: 'out', status: 'delivered' })
    addChat('3', 'Done', { direction: 'out', status: 'read' })
    addChat('4', 'Theirs', { direction: 'in', status: 'sent' })
    addChat('5', 'Pending', { direction: 'out', status: 'sending' })
    expect(chatsAwaitingRead('1')).toEqual(['2'])
    expect(chatsAwaitingRead(null).sort()).toEqual(['1', '2'])
  })
})

describe('chat list photos', () => {
  it('uses the profile photo when one exists', async () => {
    logIn()
    useChats.getState().ensureChat({ chatId: '9', title: '@zed_user' })
    fakeFetch({ getAvatar: { urlAvatar: 'https://img.test/a.jpg' } })
    const { container } = renderApp()
    await waitFor(() =>
      expect(container.querySelector('img')).toHaveAttribute('src', 'https://img.test/a.jpg'),
    )
  })
})
