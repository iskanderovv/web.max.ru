import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useChats } from '@/features/chats/store'
import { fakeFetch } from '@tests/helpers/fakeFetch'
import { bodyOf, logIn, renderApp } from '@tests/helpers/app'

describe('new contact', () => {
  async function openDialog(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: /new chat/i }))
    return screen.getByRole('dialog', { name: 'New Contact' })
  }
  async function fill(
    user: ReturnType<typeof userEvent.setup>,
    v: { first?: string; last?: string; phone?: string },
  ) {
    if (v.first) await user.type(screen.getByLabelText('First name'), v.first)
    if (v.last) await user.type(screen.getByLabelText('Last name'), v.last)
    if (v.phone) await user.type(screen.getByLabelText('Phone Number'), v.phone)
    await user.click(screen.getByRole('button', { name: /add contact/i }))
  }

  it('checks the number, adds the contact and opens the chat', async () => {
    const user = userEvent.setup()
    logIn()
    const api = fakeFetch({
      checkAccount: { exist: true, chatId: '8019310179', username: '@ann_lee' },
      addContact: { addContact: true },
    })
    renderApp()
    await openDialog(user)
    await fill(user, { first: 'Ann', last: 'Lee', phone: '+998 90 123-45-67' })
    await waitFor(() => expect(useChats.getState().activeChatId).toBe('8019310179'))
    expect(bodyOf(api.of('checkAccount')[0])).toEqual({ phoneNumber: 998901234567 })
    expect(bodyOf(api.of('addContact')[0])).toEqual({
      chatId: '8019310179',
      firstName: 'Ann',
      lastName: 'Lee',
    })
    expect(useChats.getState().chats['8019310179']).toMatchObject({
      title: 'Ann Lee',
      username: '@ann_lee',
      type: 'user',
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('last name is optional and omitted from the request', async () => {
    const user = userEvent.setup()
    logIn()
    const api = fakeFetch({
      checkAccount: { exist: true, chatId: '5' },
      addContact: { addContact: true },
    })
    renderApp()
    await openDialog(user)
    await fill(user, { first: 'Bob', phone: '998901112233' })
    await waitFor(() => expect(useChats.getState().chats['5']?.title).toBe('Bob'))
    expect(bodyOf(api.of('addContact')[0])).toEqual({ chatId: '5', firstName: 'Bob' })
  })

  it('treats "already exists" as success', async () => {
    const user = userEvent.setup()
    logIn()
    fakeFetch({
      checkAccount: { exist: true, chatId: '5' },
      addContact: () =>
        new Response(JSON.stringify({ message: 'Contact 5 already exists.' }), { status: 400 }),
    })
    renderApp()
    await openDialog(user)
    await fill(user, { first: 'Bob', phone: '998901112233' })
    await waitFor(() => expect(useChats.getState().activeChatId).toBe('5'))
  })

  it('shows an error and creates nothing when the number is not on Telegram', async () => {
    const user = userEvent.setup()
    logIn()
    const api = fakeFetch({ checkAccount: { exist: false, chatId: '' } })
    renderApp()
    await openDialog(user)
    await fill(user, { first: 'Ghost', phone: '998901112233' })
    expect(await screen.findByRole('alert')).toHaveTextContent(/not on telegram/i)
    expect(api.of('addContact')).toHaveLength(0)
    expect(useChats.getState().chats).toEqual({})
  })

  it('shows addContact errors', async () => {
    const user = userEvent.setup()
    logIn()
    fakeFetch({
      checkAccount: { exist: true, chatId: '5' },
      addContact: () =>
        new Response(JSON.stringify({ message: 'Contact limit reached' }), { status: 400 }),
    })
    renderApp()
    await openDialog(user)
    await fill(user, { first: 'Bob', phone: '998901112233' })
    expect(await screen.findByRole('alert')).toHaveTextContent('Contact limit reached')
    expect(useChats.getState().chats).toEqual({})
  })

  it('validates first name and phone without calling the API', async () => {
    const user = userEvent.setup()
    logIn()
    const api = fakeFetch()
    renderApp()
    await openDialog(user)
    await fill(user, { last: 'Only', phone: 'abc' })
    expect(await screen.findByText('First name is required')).toBeInTheDocument()
    expect(screen.getByText(/enter a valid phone number/i)).toBeInTheDocument()
    expect(api.of('checkAccount')).toHaveLength(0)
  })
})

describe('new contact form layout', () => {
  it('new contact form has no avatar placeholder', async () => {
    const user = userEvent.setup()
    logIn()
    fakeFetch()
    renderApp()
    await user.click(screen.getByRole('button', { name: /new chat/i }))
    const dialog = screen.getByRole('dialog', { name: 'New Contact' })
    expect(within(dialog).queryByText('?')).not.toBeInTheDocument()
    expect(within(dialog).getByLabelText('First name')).toBeInTheDocument()
  })
})
