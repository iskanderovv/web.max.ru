import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import incoming from '../fixtures/receive-incoming-text.json'
import App from './App'
import { useAuth } from './store/auth'
import { useChats } from './store/chats'
import { fakeFetch } from './test/fakeFetch'

function renderApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  )
}

const bodyOf = (call?: { init?: RequestInit }) => JSON.parse(String(call?.init?.body))

const logIn = () =>
  useAuth.setState({
    credentials: { apiUrl: 'https://x.test', idInstance: '1', apiTokenInstance: 't' },
  })

beforeEach(() => {
  localStorage.clear()
  useAuth.setState({ credentials: null })
  useChats.getState().reset()
})
afterEach(() => vi.unstubAllGlobals())

describe('login', () => {
  async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText('idInstance'), '410022760325')
    await user.type(screen.getByLabelText('apiTokenInstance'), 'secret')
    await user.click(screen.getByRole('button', { name: /connect/i }))
  }

  it('shows validation errors for empty form', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: /connect/i }))
    expect(await screen.findAllByText(/digits only|required|valid url/i)).not.toHaveLength(0)
    expect(useAuth.getState().credentials).toBeNull()
  })

  it('prefills apiUrl from idInstance', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.type(screen.getByLabelText('idInstance'), '410022760325')
    expect(screen.getByLabelText('apiUrl')).toHaveValue('https://4100.api.green-api.com')
  })

  it('logs in when instance is authorized and persists credentials', async () => {
    const user = userEvent.setup()
    fakeFetch({ getStateInstance: { stateInstance: 'authorized' } })
    renderApp()
    await fillAndSubmit(user)
    await waitFor(() => expect(useAuth.getState().credentials?.idInstance).toBe('410022760325'))
    expect(await screen.findByText(/no chats yet/i)).toBeInTheDocument()
    expect(localStorage.getItem('tg-chat-auth')).toContain('410022760325')
  })

  it('rejects an instance that is not authorized', async () => {
    const user = userEvent.setup()
    fakeFetch({ getStateInstance: { stateInstance: 'notAuthorized' } })
    renderApp()
    await fillAndSubmit(user)
    expect(await screen.findByRole('alert')).toHaveTextContent(/not authorized/i)
    expect(useAuth.getState().credentials).toBeNull()
  })

  it('log out clears credentials and chats', async () => {
    const user = userEvent.setup()
    fakeFetch()
    logIn()
    useChats.getState().ensureChat({ chatId: '1', title: 'A' })
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: /log out/i }))
    expect(useAuth.getState().credentials).toBeNull()
    expect(useChats.getState().chats).toEqual({})
    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument()
  })
})

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

describe('sending', () => {
  const setup = () => {
    logIn()
    useChats.getState().ensureChat({ chatId: '55', title: '@bob_test' })
    useChats.getState().selectChat('55')
  }

  it('sends on Enter, shows message and marks it sent', async () => {
    const user = userEvent.setup()
    setup()
    const api = fakeFetch({ sendMessage: { idMessage: 'srv-1' } })
    renderApp()
    await user.type(screen.getByLabelText('Message'), 'hello{Enter}')
    expect(await screen.findByLabelText('Sent')).toBeInTheDocument()
    expect(bodyOf(api.of('sendMessage')[0])).toEqual({ chatId: '55', message: 'hello' })
    expect(useChats.getState().chats['55'].messages[0]).toMatchObject({
      id: 'srv-1',
      text: 'hello',
      direction: 'out',
      status: 'sent',
    })
    expect(screen.getByLabelText('Message')).toHaveValue('')
  })

  it('Shift+Enter adds a new line instead of sending', async () => {
    const user = userEvent.setup()
    setup()
    const api = fakeFetch()
    renderApp()
    await user.type(screen.getByLabelText('Message'), 'a{Shift>}{Enter}{/Shift}b')
    expect(screen.getByLabelText('Message')).toHaveValue('a\nb')
    expect(api.of('sendMessage')).toHaveLength(0)
  })

  it('does not send blank text', async () => {
    const user = userEvent.setup()
    setup()
    const api = fakeFetch()
    renderApp()
    await user.type(screen.getByLabelText('Message'), '   {Enter}')
    expect(api.of('sendMessage')).toHaveLength(0)
    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled()
  })

  it('marks failed and retries', async () => {
    const user = userEvent.setup()
    setup()
    let n = 0
    const api = fakeFetch({
      sendMessage: () => {
        if (n++ === 0) throw new TypeError('Failed to fetch')
        return new Response(JSON.stringify({ idMessage: 'srv-2' }))
      },
    })
    renderApp()
    await user.type(screen.getByLabelText('Message'), 'retry me{Enter}')
    await user.click(await screen.findByRole('button', { name: /failed to send/i }))
    expect(await screen.findByLabelText('Sent')).toBeInTheDocument()
    expect(api.of('sendMessage')).toHaveLength(2)
    expect(useChats.getState().chats['55'].messages).toHaveLength(1)
  })
})

describe('receiving', () => {
  it('shows an incoming reply in the open chat and deletes the notification', async () => {
    logIn()
    useChats.getState().ensureChat({ chatId: '10000000', title: '@vasilisa' })
    useChats.getState().selectChat('10000000')
    let served = false
    const api = fakeFetch({
      receiveNotification: (_u, init) => {
        if (!served) {
          served = true
          return new Response(JSON.stringify(incoming))
        }
        return new Promise<Response>((_res, rej) =>
          init?.signal?.addEventListener('abort', () =>
            rej(new DOMException('Aborted', 'AbortError')),
          ),
        ) as unknown as Response
      },
      deleteNotification: { result: true, reason: '' },
    })
    renderApp()
    const list = await screen.findByRole('list', { name: 'Messages' })
    expect(await within(list).findByText('Hello from Green-API!')).toBeInTheDocument()
    await waitFor(() => expect(api.of('deleteNotification')).toHaveLength(1))
    expect(api.of('deleteNotification')[0].url).toMatch(/deleteNotification\/t\/1234567$/)
  })

  it('shows unread badge for a chat that is not open', async () => {
    logIn()
    useChats.getState().ensureChat({ chatId: '10000000', title: '@vasilisa' })
    let served = false
    fakeFetch({
      receiveNotification: (_u, init) => {
        if (!served) {
          served = true
          return new Response(JSON.stringify(incoming))
        }
        return new Promise<Response>((_res, rej) =>
          init?.signal?.addEventListener('abort', () =>
            rej(new DOMException('Aborted', 'AbortError')),
          ),
        ) as unknown as Response
      },
      deleteNotification: { result: true, reason: '' },
    })
    renderApp()
    expect(await screen.findByText('Hello from Green-API!')).toBeInTheDocument()
    expect(useChats.getState().chats['10000000'].unread).toBe(1)
  })

  it('warns when incoming notifications are disabled', async () => {
    logIn()
    fakeFetch({ getSettings: { incomingWebhook: 'no' } })
    renderApp()
    expect(await screen.findByRole('alert')).toHaveTextContent(/incoming messages are disabled/i)
  })
})

describe('menu, contacts, chat management', () => {
  it('burger opens the side menu with account info and actions', async () => {
    const user = userEvent.setup()
    logIn()
    fakeFetch({ getSettings: { incomingWebhook: 'yes', wid: '998885880331@c.us' } })
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    const nav = screen.getByRole('navigation', { name: /main menu/i })
    expect(await within(nav).findByText('+998885880331')).toBeInTheDocument()
    for (const name of ['New chat', 'Contacts', 'Log out']) {
      expect(within(nav).getByRole('button', { name })).toBeInTheDocument()
    }
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('navigation', { name: /main menu/i })).not.toBeInTheDocument()
  })

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
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: 'Contacts' }))
    expect(await screen.findByText('Bob Roy')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Search contacts'), 'ann')
    expect(screen.queryByText('Bob Roy')).not.toBeInTheDocument()
    await user.click(screen.getByText('Ann Lee'))
    expect(useChats.getState().activeChatId).toBe('1')
    expect(useChats.getState().chats['1'].title).toBe('Ann Lee')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows an error when contacts cannot be loaded', async () => {
    const user = userEvent.setup()
    logIn()
    fakeFetch({ getContacts: () => new Response('{}', { status: 500 }) })
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: 'Contacts' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('deletes a chat after confirmation (and not on cancel)', async () => {
    const user = userEvent.setup()
    logIn()
    useChats.getState().ensureChat({ chatId: '9', title: '@zed_user' })
    useChats.getState().selectChat('9')
    fakeFetch()
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Chat actions' }))
    await user.click(screen.getByRole('menuitem', { name: /delete chat/i }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(useChats.getState().chats['9']).toBeDefined()

    await user.click(screen.getByRole('button', { name: 'Chat actions' }))
    await user.click(screen.getByRole('menuitem', { name: /delete chat/i }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(useChats.getState().chats['9']).toBeUndefined()
    expect(screen.getByText(/no chats yet/i)).toBeInTheDocument()
  })

  it('clears history but keeps the chat', async () => {
    const user = userEvent.setup()
    logIn()
    useChats.getState().ensureChat({ chatId: '9', title: '@zed_user' })
    useChats
      .getState()
      .addMessage('9', { id: 'm', text: 'old', direction: 'in', timestamp: 1, status: 'sent' })
    useChats.getState().selectChat('9')
    fakeFetch()
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Chat actions' }))
    await user.click(screen.getByRole('menuitem', { name: /clear history/i }))
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(useChats.getState().chats['9'].messages).toEqual([])
    expect(screen.getByText(/no messages here yet/i)).toBeInTheDocument()
  })
})

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
    renderApp()
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
    renderApp()
    const list = await screen.findByRole('list', { name: 'Messages' })
    expect(within(list).getByText('earlier')).toBeInTheDocument()
    expect(within(list).getByLabelText('Read')).toBeInTheDocument()
  })

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

describe('message actions', () => {
  const NOW = () => Math.floor(Date.now() / 1000)
  const out = (over: Partial<import('./store/chats').ChatMessage> = {}) => ({
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

describe('presence', () => {
  const openChat = (type?: 'user' | 'bot' | 'channel') => {
    logIn()
    useChats.getState().ensureChat({ chatId: '9', title: '@zed_user', type })
    useChats.getState().selectChat('9')
  }

  it('shows "online" for a fresh lastSeen', async () => {
    openChat('user')
    fakeFetch({ getContactInfo: { lastSeen: Math.floor(Date.now() / 1000) - 10 } })
    renderApp()
    expect(await screen.findByText('online')).toBeInTheDocument()
  })

  it('shows a last seen time for an older lastSeen', async () => {
    openChat()
    fakeFetch({ getContactInfo: { lastSeen: Math.floor(Date.now() / 1000) - 3 * 86_400 } })
    renderApp()
    expect(await screen.findByText(/^last seen [A-Z][a-z]{2} \d{1,2}$/)).toBeInTheDocument()
  })

  it('shows "last seen recently" when privacy hides it', async () => {
    openChat('user')
    fakeFetch({ getContactInfo: { lastSeen: 0 } })
    renderApp()
    expect(await screen.findByText('last seen recently')).toBeInTheDocument()
  })

  it('does not ask for presence of bots and channels', async () => {
    openChat('bot')
    const api = fakeFetch()
    renderApp()
    expect(screen.getByText(/bot/)).toBeInTheDocument()
    expect(api.of('getContactInfo')).toHaveLength(0)
  })

  it('falls back to username when presence cannot be loaded', async () => {
    openChat('user')
    useChats
      .getState()
      .ensureChat({ chatId: '9', title: 'Zed', username: '@zed_user', type: 'user' })
    fakeFetch({ getContactInfo: () => new Response('{}', { status: 500 }) })
    renderApp()
    expect(await screen.findByText('@zed_user')).toBeInTheDocument()
  })
})

describe('contacts presence', () => {
  const NOWS = () => Math.floor(Date.now() / 1000)

  it('shows online / last seen under contact names instead of username and phone', async () => {
    const user = userEvent.setup()
    logIn()
    const api = fakeFetch({
      getContacts: [
        {
          chatId: '1',
          contactName: 'Ann Lee',
          type: 'user',
          username: '@ann',
          phoneNumber: 998901112233,
        },
        { chatId: '2', contactName: 'Bob Roy', type: 'user', username: '@bob' },
        { chatId: '3', contactName: 'Cid Poe', type: 'user' },
      ],
      getContactInfo: (_url, init) => {
        const { chatId } = JSON.parse(String(init?.body))
        const lastSeen = chatId === '1' ? NOWS() - 5 : chatId === '2' ? 0 : NOWS() - 3 * 86_400
        return new Response(JSON.stringify({ lastSeen }))
      },
    })
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: 'Contacts' }))
    const dialog = await screen.findByRole('dialog', { name: 'Contacts' })
    expect(await within(dialog).findByText('online')).toBeInTheDocument()
    expect(await within(dialog).findByText('last seen recently')).toBeInTheDocument()
    expect(await within(dialog).findByText(/^last seen [A-Z][a-z]{2} \d{1,2}$/)).toBeInTheDocument()
    expect(within(dialog).queryByText(/@ann|@bob|998901112233/)).not.toBeInTheDocument()
    expect(
      api
        .of('getContactInfo')
        .map((c) => bodyOf(c).chatId)
        .sort(),
    ).toEqual(['1', '2', '3'])
  })

  it('shows a neutral status when a lookup fails', async () => {
    const user = userEvent.setup()
    logIn()
    fakeFetch({
      getContacts: [{ chatId: '1', contactName: 'Ann Lee', type: 'user' }],
      getContactInfo: () => new Response('{}', { status: 500 }),
    })
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: 'Contacts' }))
    const dialog = await screen.findByRole('dialog', { name: 'Contacts' })
    expect(await within(dialog).findByText('last seen recently')).toBeInTheDocument()
  })
})

describe('chat names', () => {
  it('replaces a @username title with the real first and last name', async () => {
    logIn()
    useChats.getState().ensureChat({ chatId: '9', title: '@zed_user', type: 'user' })
    useChats.getState().ensureChat({ chatId: '8', title: 'Already Named', type: 'user' })
    useChats.getState().ensureChat({ chatId: '-7', title: '@some_group', type: 'supergroup' })
    const api = fakeFetch({
      getContactInfo: { lastSeen: 0, name: 'zed', contactName: 'Zed Alpha' },
    })
    renderApp()
    await waitFor(() => expect(useChats.getState().chats['9'].title).toBe('Zed Alpha'))
    expect(useChats.getState().chats['8'].title).toBe('Already Named')
    expect(useChats.getState().chats['-7'].title).toBe('@some_group')
    expect(api.of('getContactInfo').map((c) => bodyOf(c).chatId)).not.toContain('8')
    expect(api.of('getContactInfo').map((c) => bodyOf(c).chatId)).not.toContain('-7')
    expect(useChats.getState().chats['9'].username).toBeUndefined()
  })

  it('keeps the handle when no name is available and does not ask again', async () => {
    logIn()
    useChats.getState().ensureChat({ chatId: '9', title: '@zed_user', type: 'user' })
    fakeFetch({ getContactInfo: { lastSeen: 0 } })
    renderApp()
    await waitFor(() => expect(useChats.getState().chats['9'].titleChecked).toBe(true))
    expect(useChats.getState().chats['9'].title).toBe('@zed_user')
  })

  it('uses the real name when a @username lookup opens a chat', async () => {
    const user = userEvent.setup()
    logIn()
    fakeFetch({
      getChats: [],
      getContacts: [],
      checkAccount: { exist: true, chatId: '55', username: '@some_person' },
      getContactInfo: { lastSeen: 0, name: 'Some Person' },
    })
    renderApp()
    await user.type(screen.getByLabelText('Search chats'), '@some_person')
    await user.click(await screen.findByRole('button', { name: /search @some_person/i }))
    await waitFor(() => expect(useChats.getState().activeChatId).toBe('55'))
    expect(useChats.getState().chats['55']).toMatchObject({
      title: 'Some Person',
      username: '@some_person',
    })
  })

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
