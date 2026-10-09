import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useChats } from '@/features/chats/store'
import { fakeFetch } from '@tests/helpers/fakeFetch'
import { logIn, renderApp } from '@tests/helpers/app'

describe('contacts list', () => {
  it('contacts list opens a chat with the picked contact', async () => {
    const user = userEvent.setup()
    logIn()
    fakeFetch({
      getContacts: [
        { chatId: '1', name: 'Ann', contactName: 'Ann Lee', type: 'user', username: '@ann' },
        {
          chatId: '2',
          name: 'Bob',
          contactName: 'Bob Roy',
          type: 'user',
          phoneNumber: 998901112233,
        },
      ],
    })
    await renderApp()
    await user.click(screen.getByRole('button', { name: 'Contacts' }))
    expect(await screen.findByText('Bob Roy')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Search contacts'), 'ann')
    expect(screen.queryByText('Bob Roy')).not.toBeInTheDocument()
    await user.click(screen.getByText('Ann Lee'))
    expect(useChats.getState().activeChatId).toBe('1')
    expect(useChats.getState().chats['1'].title).toBe('Ann Lee')
  })

  it('shows an error when contacts cannot be loaded', async () => {
    const user = userEvent.setup()
    logIn()
    fakeFetch({ getContacts: () => new Response('{}', { status: 500 }) })
    await renderApp()
    await user.click(screen.getByRole('button', { name: 'Contacts' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})

describe('contacts list and the metered presence lookup', () => {
  const CONTACTS = [
    {
      chatId: '1',
      contactName: 'Ann Lee',
      type: 'user',
      username: '@ann',
      phoneNumber: 998901112233,
    },
    { chatId: '2', contactName: 'Bob Roy', type: 'user', username: '@bob' },
    { chatId: '3', contactName: 'Cid Poe', type: 'user' },
  ]
  const openContacts = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('button', { name: 'Contacts' }))
    return screen.findByRole('region', { name: 'Contacts' })
  }

  it('shows username and phone under names and never fetches presence per row', async () => {
    const user = userEvent.setup()
    logIn()
    const api = fakeFetch({ getContacts: CONTACTS })
    await renderApp()
    const dialog = await openContacts(user)
    expect(await within(dialog).findByText('@ann · +998901112233')).toBeInTheDocument()
    expect(within(dialog).getByText('@bob')).toBeInTheDocument()
    expect(within(dialog).getByText('Telegram')).toBeInTheDocument()
    await new Promise((r) => setTimeout(r, 50))
    expect(api.of('getContactInfo')).toHaveLength(0)
  })

  it('shows the status of a contact whose chat was already opened (shared cache)', async () => {
    const user = userEvent.setup()
    logIn()
    useChats
      .getState()
      .ensureChat({ chatId: '1', title: 'Ann Lee', type: 'user', titleChecked: true } as never)
    useChats.getState().selectChat('1')
    const api = fakeFetch({
      getContacts: CONTACTS,
      getContactInfo: { lastSeen: Math.floor(Date.now() / 1000) - 5 },
    })
    await renderApp()
    await waitFor(() => expect(screen.getAllByText('online').length).toBeGreaterThan(0))
    const dialog = await openContacts(user)
    expect(await within(dialog).findByText('online')).toBeInTheDocument()
    expect(within(dialog).getByText('@bob')).toBeInTheDocument()
    expect(api.of('getContactInfo')).toHaveLength(1)
  })
})

describe('contact photos', () => {
  const CONTACTS = [
    { chatId: '1', contactName: 'Ann Lee', type: 'user' },
    { chatId: '2', contactName: 'Bob Roy', type: 'user' },
    { chatId: '3', contactName: 'Cid Poe', type: 'user' },
  ]
  const photoFor = (_url: string, init?: RequestInit) => {
    const { chatId } = JSON.parse(String(init?.body))
    return new Response(
      JSON.stringify({ urlAvatar: chatId === '2' ? '' : `https://img.test/${chatId}.jpg` }),
    )
  }
  const openContacts = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('button', { name: 'Contacts' }))
    return screen.findByRole('region', { name: 'Contacts' })
  }

  it('shows profile photos in the contacts list and falls back to a letter when there is none', async () => {
    const user = userEvent.setup()
    logIn()
    fakeFetch({ getContacts: CONTACTS, getAvatar: photoFor })
    await renderApp()
    const panel = await openContacts(user)
    await waitFor(() => expect(panel.querySelectorAll('img')).toHaveLength(2))
    expect([...panel.querySelectorAll('img')].map((i) => i.getAttribute('src')).sort()).toEqual([
      'https://img.test/1.jpg',
      'https://img.test/3.jpg',
    ])
    expect(within(panel).getByText('B')).toBeInTheDocument()
  })

  it('looks each photo up only once, even across visits', async () => {
    const user = userEvent.setup()
    logIn()
    const api = fakeFetch({ getContacts: CONTACTS, getAvatar: photoFor })
    await renderApp()
    await openContacts(user)
    await waitFor(() => expect(api.of('getAvatar')).toHaveLength(3))
    await user.click(screen.getByRole('button', { name: 'Chats' }))
    await user.click(screen.getByRole('button', { name: 'Contacts' }))
    await screen.findByRole('region', { name: 'Contacts' })
    await new Promise((r) => setTimeout(r, 50))
    expect(api.of('getAvatar')).toHaveLength(3)
  })

  it('stops looking up photos when the monthly budget is spent', async () => {
    const { AVATAR_MONTHLY_BUDGET } = await import('@/features/contacts/hooks/useContactAvatar')
    const { spendBudget } = await import('@/api/quota')
    for (let i = 0; i < AVATAR_MONTHLY_BUDGET; i++) spendBudget('avatar')
    const user = userEvent.setup()
    logIn()
    const api = fakeFetch({ getContacts: CONTACTS, getAvatar: photoFor })
    await renderApp()
    const panel = await openContacts(user)
    await within(panel).findByText('Ann Lee')
    await new Promise((r) => setTimeout(r, 50))
    expect(api.of('getAvatar')).toHaveLength(0)
    expect(panel.querySelectorAll('img')).toHaveLength(0)
  })

  it('keeps letter avatars (no crash) when the photo lookup fails', async () => {
    const user = userEvent.setup()
    logIn()
    fakeFetch({ getContacts: CONTACTS, getAvatar: () => new Response('{}', { status: 500 }) })
    await renderApp()
    const panel = await openContacts(user)
    expect(await within(panel).findByText('Ann Lee')).toBeInTheDocument()
    await new Promise((r) => setTimeout(r, 50))
    expect(panel.querySelectorAll('img')).toHaveLength(0)
    expect(within(panel).getByText('A')).toBeInTheDocument()
  })
})
