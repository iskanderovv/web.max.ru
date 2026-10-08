import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { useAuth } from './store/auth'
import { useChats } from './store/chats'

function renderApp() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  )
}

function mockApi(state: string, incomingWebhook = 'yes') {
  const fn = vi.fn(
    async (url: string) =>
      new Response(
        JSON.stringify(
          url.includes('getStateInstance') ? { stateInstance: state } : { incomingWebhook },
        ),
      ),
  )
  vi.stubGlobal('fetch', fn)
  return fn
}

beforeEach(() => {
  localStorage.clear()
  useAuth.setState({ credentials: null })
  useChats.getState().reset()
})
afterEach(() => vi.unstubAllGlobals())

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('idInstance'), '410022760325')
  await user.type(screen.getByLabelText('apiTokenInstance'), 'secret')
  await user.click(screen.getByRole('button', { name: /connect/i }))
}

describe('login', () => {
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
    mockApi('authorized')
    renderApp()
    await fillAndSubmit(user)
    await waitFor(() => expect(useAuth.getState().credentials?.idInstance).toBe('410022760325'))
    expect(screen.getByText(/no chats yet/i)).toBeInTheDocument()
    expect(localStorage.getItem('tg-chat-auth')).toContain('410022760325')
  })

  it('rejects an instance that is not authorized', async () => {
    const user = userEvent.setup()
    mockApi('notAuthorized')
    renderApp()
    await fillAndSubmit(user)
    expect(await screen.findByRole('alert')).toHaveTextContent(/not authorized/i)
    expect(useAuth.getState().credentials).toBeNull()
  })

  it('log out clears credentials and chats', async () => {
    const user = userEvent.setup()
    useAuth.setState({
      credentials: { apiUrl: 'https://x.test', idInstance: '1', apiTokenInstance: 't' },
    })
    useChats.getState().ensureChat({ chatId: '1', title: 'A' })
    renderApp()
    await user.click(screen.getByRole('button', { name: /log out/i }))
    expect(useAuth.getState().credentials).toBeNull()
    expect(useChats.getState().chats).toEqual({})
    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument()
  })
})

describe('new chat', () => {
  const logIn = () =>
    useAuth.setState({
      credentials: { apiUrl: 'https://x.test', idInstance: '1', apiTokenInstance: 't' },
    })

  it('creates a chat from @username via checkAccount', async () => {
    const user = userEvent.setup()
    logIn()
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ exist: true, chatId: '8019310179', username: '@akbar_iskanderov' }),
        ),
    )
    vi.stubGlobal('fetch', fetchMock)
    renderApp()
    await user.click(screen.getByRole('button', { name: /new chat/i }))
    await user.type(screen.getByLabelText(/phone number or @username/i), '@akbar_iskanderov')
    await user.click(screen.getByRole('button', { name: /start chat/i }))
    await waitFor(() => expect(useChats.getState().activeChatId).toBe('8019310179'))
    expect(
      JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string),
    ).toEqual({
      username: '@akbar_iskanderov',
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows a message when the account does not exist', async () => {
    const user = userEvent.setup()
    logIn()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ exist: false, chatId: '' }))),
    )
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
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderApp()
    await user.click(screen.getByRole('button', { name: /new chat/i }))
    await user.type(screen.getByLabelText(/phone number or @username/i), 'x')
    await user.click(screen.getByRole('button', { name: /start chat/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/enter a phone number/i)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
