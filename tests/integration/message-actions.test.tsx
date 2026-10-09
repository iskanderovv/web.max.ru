import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useChats } from '@/features/chats/store'
import { fakeFetch } from '@tests/helpers/fakeFetch'
import { bodyOf, logIn, renderApp } from '@tests/helpers/app'

describe('message actions', () => {
  const NOW = () => Math.floor(Date.now() / 1000)
  const out = (over: Partial<import('@/features/chats/store').ChatMessage> = {}) => ({
    id: 'srv-1',
    text: 'original',
    direction: 'out' as const,
    timestamp: NOW() - 30,
    status: 'sent' as const,
    ...over,
  })
  const open = (messages: ReturnType<typeof out>[], chatId = '9') => {
    logIn()
    useChats.getState().ensureChat({ chatId, title: '@zed_user' })
    for (const m of messages) useChats.getState().addMessage(chatId, m)
    useChats.getState().selectChat(chatId)
  }
  const openMenu = async (user: ReturnType<typeof userEvent.setup>) =>
    user.click(screen.getByRole('button', { name: 'Message actions' }))

  it('sends a typing indicator once per throttle window while typing', async () => {
    const user = userEvent.setup()
    open([])
    const api = fakeFetch()
    renderApp()
    await user.type(screen.getByLabelText('Message'), 'hello there')
    await waitFor(() => expect(api.of('sendTyping')).toHaveLength(1))
    expect(bodyOf(api.of('sendTyping')[0])).toEqual({ chatId: '9', typingTime: 2000 })
  })

  it('does not send typing indicators in groups', async () => {
    const user = userEvent.setup()
    open([], '-500')
    const api = fakeFetch()
    renderApp()
    await user.type(screen.getByLabelText('Message'), 'hi')
    expect(api.of('sendTyping')).toHaveLength(0)
  })

  it('edits an own message and marks it edited', async () => {
    const user = userEvent.setup()
    open([out()])
    const api = fakeFetch({ editMessage: { idMessage: 'srv-1' } })
    renderApp()
    await openMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }))
    const input = screen.getByLabelText('Message')
    expect(input).toHaveValue('original')
    await user.clear(input)
    await user.type(input, 'fixed{Enter}')
    await waitFor(() => expect(useChats.getState().chats['9'].messages[0].text).toBe('fixed'))
    expect(bodyOf(api.of('editMessage')[0])).toEqual({
      chatId: '9',
      idMessage: 'srv-1',
      message: 'fixed',
    })
    expect(api.of('sendMessage')).toHaveLength(0)
    expect(screen.getByText('edited')).toBeInTheDocument()
    expect(screen.getByLabelText('Message')).toHaveValue('')
    expect(screen.queryByText('Edit message')).not.toBeInTheDocument()
  })

  it('shows the API error when editing is refused and keeps the text', async () => {
    const user = userEvent.setup()
    open([out()])
    fakeFetch({
      editMessage: () =>
        new Response(JSON.stringify({ message: 'Message editing time expired' }), { status: 400 }),
    })
    renderApp()
    await openMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }))
    await user.type(screen.getByLabelText('Message'), '!{Enter}')
    expect(await screen.findByRole('alert')).toHaveTextContent('Message editing time expired')
    expect(useChats.getState().chats['9'].messages[0].text).toBe('original')
  })

  it('Escape cancels editing', async () => {
    const user = userEvent.setup()
    open([out()])
    const api = fakeFetch()
    renderApp()
    await openMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByText('Edit message')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Message')).toHaveValue('')
    expect(api.of('editMessage')).toHaveLength(0)
  })

  it('deletes an own message for everyone by default', async () => {
    const user = userEvent.setup()
    open([out()])
    const api = fakeFetch({ deleteMessage: new Response('') })
    renderApp()
    await openMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }))
    expect(screen.getByLabelText(/also delete for @zed_user/i)).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(useChats.getState().chats['9'].messages).toHaveLength(0))
    expect(bodyOf(api.of('deleteMessage')[0])).toEqual({
      chatId: '9',
      idMessage: 'srv-1',
      onlySenderDelete: false,
    })
  })

  it('deletes only on our side when the checkbox is cleared', async () => {
    const user = userEvent.setup()
    open([out()])
    const api = fakeFetch({ deleteMessage: new Response('') })
    renderApp()
    await openMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }))
    await user.click(screen.getByLabelText(/also delete for/i))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(useChats.getState().chats['9'].messages).toHaveLength(0))
    expect(bodyOf(api.of('deleteMessage')[0]).onlySenderDelete).toBe(true)
  })

  it('keeps the message and shows an error when remote delete fails', async () => {
    const user = userEvent.setup()
    open([out()])
    fakeFetch({
      deleteMessage: () =>
        new Response(JSON.stringify({ message: 'Message by id not found' }), { status: 400 }),
    })
    renderApp()
    await openMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Message by id not found')
    expect(useChats.getState().chats['9'].messages).toHaveLength(1)
  })

  it('incoming messages: no Edit, delete is local and never calls the API', async () => {
    const user = userEvent.setup()
    open([out({ id: 'in-1', direction: 'in', text: 'from them' })])
    const api = fakeFetch()
    renderApp()
    await openMenu(user)
    expect(screen.queryByRole('menuitem', { name: 'Edit' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }))
    expect(screen.queryByLabelText(/also delete for/i)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(useChats.getState().chats['9'].messages).toHaveLength(0))
    expect(api.of('deleteMessage')).toHaveLength(0)
  })

  it('hides Edit for messages older than 48 hours', async () => {
    const user = userEvent.setup()
    open([out({ timestamp: NOW() - 49 * 3600 })])
    fakeFetch()
    renderApp()
    await openMenu(user)
    expect(screen.queryByRole('menuitem', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument()
  })
})
