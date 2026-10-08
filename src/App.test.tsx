import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { useAuth } from './store/auth'

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
    expect(screen.getByText(/connected to instance/i)).toBeInTheDocument()
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

  it('log out clears credentials', async () => {
    const user = userEvent.setup()
    useAuth.setState({
      credentials: { apiUrl: 'https://x.test', idInstance: '1', apiTokenInstance: 't' },
    })
    renderApp()
    await user.click(screen.getByRole('button', { name: /log out/i }))
    expect(useAuth.getState().credentials).toBeNull()
    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument()
  })
})
