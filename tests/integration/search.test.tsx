import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useChats } from '@/features/chats/store'
import { fakeFetch } from '@tests/helpers/fakeFetch'
import { bodyOf, logIn, renderApp } from '@tests/helpers/app'

describe('search', () => {
  const dialogs = [
    {
      chatId: '1',
      name: 'Anvar Karimov',
      type: 'user',
      username: '@anvar_k',
      phoneNumber: 998901234567,
    },
    {
      chatId: '2',
      name: 'Weather Bot',
      type: 'bot',
      username: '@weather_helper_bot',
      phoneNumber: 0,
    },
    { chatId: '-3', name: 'Dev Channel', type: 'channel', username: '@dev_news', phoneNumber: 0 },
    { chatId: '-4', name: 'Dev Chat Group', type: 'supergroup', username: '', phoneNumber: 0 },
  ]
  const search = async (user: ReturnType<typeof userEvent.setup>, text: string) =>
    user.type(screen.getByLabelText('Search chats'), text)

  it('finds users, bots, channels and groups from the account dialogs', async () => {
    const user = userEvent.setup()
    logIn()
    fakeFetch({ getChats: dialogs, getContacts: [] })
    renderApp()
    await search(user, 'dev')
    const results = await screen.findByRole('region', { name: 'Search results' })
    expect(await within(results).findByText('Dev Channel')).toBeInTheDocument()
    expect(within(results).getByText('Dev Chat Group')).toBeInTheDocument()
    expect(within(results).queryByText('Weather Bot')).not.toBeInTheDocument()
    expect(within(results).getByText('@dev_news · channel')).toBeInTheDocument()
    expect(within(results).getByText('group')).toBeInTheDocument()
    expect(within(results).getByText('Global search')).toBeInTheDocument()
  })

  it('labels bots and opens the picked result as a chat with its type', async () => {
    const user = userEvent.setup()
    logIn()
    fakeFetch({ getChats: dialogs, getContacts: [] })
    renderApp()
    await search(user, 'weather')
    await user.click(await screen.findByText('Weather Bot'))
    expect(useChats.getState().activeChatId).toBe('2')
    expect(useChats.getState().chats['2']).toMatchObject({
      type: 'bot',
      username: '@weather_helper_bot',
    })
    expect(screen.getByLabelText('Search chats')).toHaveValue('')
  })

  it('matches by phone number digits and username without @', async () => {
    const user = userEvent.setup()
    logIn()
    fakeFetch({ getChats: dialogs, getContacts: [] })
    renderApp()
    await search(user, '90123')
    expect(await screen.findByText('Anvar Karimov')).toBeInTheDocument()
  })

  it('shows existing app chats under Chats and not again under Global search', async () => {
    const user = userEvent.setup()
    logIn()
    useChats.getState().ensureChat({ chatId: '1', title: 'Anvar Karimov', username: '@anvar_k' })
    fakeFetch({ getChats: dialogs, getContacts: [] })
    renderApp()
    await search(user, 'anvar')
    const results = await screen.findByRole('region', { name: 'Search results' })
    expect(within(results).getByText('Chats')).toBeInTheDocument()
    expect(within(results).getAllByText('Anvar Karimov')).toHaveLength(1)
    expect(within(results).queryByText('Global search')).not.toBeInTheDocument()
  })

  it('looks up an unknown @username on demand and opens it', async () => {
    const user = userEvent.setup()
    logIn()
    const api = fakeFetch({
      getChats: dialogs,
      getContacts: [],
      checkAccount: { exist: true, chatId: '93372553', username: '@botfather' },
    })
    renderApp()
    await search(user, '@botfather')
    await user.click(await screen.findByRole('button', { name: /search @botfather/i }))
    await waitFor(() => expect(useChats.getState().activeChatId).toBe('93372553'))
    expect(bodyOf(api.of('checkAccount')[0])).toEqual({ username: '@botfather' })
  })

  it('does not spend lookups while typing: only on click', async () => {
    const user = userEvent.setup()
    logIn()
    const api = fakeFetch({ getChats: dialogs, getContacts: [] })
    renderApp()
    await search(user, '@some_unknown_user')
    await screen.findByRole('button', { name: /search @some_unknown_user/i })
    expect(api.of('checkAccount')).toHaveLength(0)
  })

  it('reports an unknown username', async () => {
    const user = userEvent.setup()
    logIn()
    fakeFetch({
      getChats: dialogs,
      getContacts: [],
      checkAccount: { exist: false, chatId: '' },
    })
    renderApp()
    await search(user, '@nobody_here')
    await user.click(await screen.findByRole('button', { name: /search @nobody_here/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/no telegram user or bot/i)
    expect(useChats.getState().chats).toEqual({})
  })

  it('shows an empty state for no matches', async () => {
    const user = userEvent.setup()
    logIn()
    fakeFetch({ getChats: dialogs, getContacts: [] })
    renderApp()
    await search(user, 'zzzz')
    expect(await screen.findByText(/no results for/i)).toBeInTheDocument()
  })

  it('shows sender names in group chats', async () => {
    logIn()
    useChats.getState().ensureChat({ chatId: '-4', title: 'Dev Chat Group', type: 'supergroup' })
    useChats.getState().addMessage('-4', {
      id: 'g1',
      text: 'hello team',
      direction: 'in',
      timestamp: 100,
      status: 'sent',
      author: 'Dilshod',
    })
    useChats.getState().selectChat('-4')
    fakeFetch()
    renderApp()
    expect(await screen.findByText('Dilshod')).toBeInTheDocument()
    expect(screen.getByText(/group/)).toBeInTheDocument()
  })
})
