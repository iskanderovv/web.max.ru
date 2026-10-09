import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useChats } from '@/features/chats/store'
import { fakeFetch } from '@tests/helpers/fakeFetch'
import { logIn, renderApp } from '@tests/helpers/app'

describe('delivery marks and history', () => {
  it('shows one check for sent and two for read', async () => {
    logIn()
    useChats.getState().ensureChat({ chatId: '9', title: '@zed_user' })
    const add = (id: string, status: 'sent' | 'read') =>
      useChats
        .getState()
        .addMessage('9', { id, text: id, direction: 'out', timestamp: 100, status })
    add('a', 'sent')
    add('b', 'read')
    useChats.getState().selectChat('9')
    fakeFetch()
    await renderApp()
    expect(screen.getAllByLabelText('Sent')).toHaveLength(1)
    expect(screen.getAllByLabelText('Read')).toHaveLength(1)
  })

  it('imports server history when a fresh chat is opened', async () => {
    logIn()
    useChats.getState().ensureChat({ chatId: '9', title: '@zed_user' })
    useChats.getState().selectChat('9')
    fakeFetch({
      getChatHistory: [
        {
          type: 'incoming',
          idMessage: 'h1',
          timestamp: 10,
          typeMessage: 'textMessage',
          textMessage: 'earlier',
        },
        {
          type: 'outgoing',
          idMessage: 'h2',
          timestamp: 20,
          typeMessage: 'textMessage',
          textMessage: 'seen',
          statusMessage: 'read',
        },
      ],
    })
    await renderApp()
    const list = await screen.findByRole('list', { name: 'Messages' })
    expect(within(list).getByText('earlier')).toBeInTheDocument()
    expect(within(list).getByLabelText('Read')).toBeInTheDocument()
  })
})
