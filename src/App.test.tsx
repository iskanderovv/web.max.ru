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

describe('new chat', () => {
  it('creates a chat from @username via checkAccount', async () => {
    const user = userEvent.setup()
    logIn()
    const api = fakeFetch({
      checkAccount: { exist: true, chatId: '8019310179', username: '@akbar_iskanderov' },
    })
    renderApp()
    await user.click(screen.getByRole('button', { name: /new chat/i }))
    await user.type(screen.getByLabelText(/phone number or @username/i), '@akbar_iskanderov')
    await user.click(screen.getByRole('button', { name: /start chat/i }))
    await waitFor(() => expect(useChats.getState().activeChatId).toBe('8019310179'))
    expect(bodyOf(api.of('checkAccount')[0])).toEqual({ username: '@akbar_iskanderov' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows a message when the account does not exist', async () => {
    const user = userEvent.setup()
    logIn()
    fakeFetch({ checkAccount: { exist: false, chatId: '' } })
    renderApp()
    await user.click(screen.getByRole('button', { name: /new chat/i }))
    await user.type(screen.getByLabelText(/phone number or @username/i), '998901234567')
    await user.click(screen.getByRole('button', { name: /start chat/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/no telegram account/i)
    expect(useChats.getState().chats).toEqual({})
  })

  it('rejects malformed input without calling the API', async () => {
    const user = userEvent.setup()
    logIn()
    const api = fakeFetch()
    renderApp()
    await user.click(screen.getByRole('button', { name: /new chat/i }))
    await user.type(screen.getByLabelText(/phone number or @username/i), 'x')
    await user.click(screen.getByRole('button', { name: /start chat/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/enter a phone number/i)
    expect(api.of('checkAccount')).toHaveLength(0)
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
