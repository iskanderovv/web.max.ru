import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import App from '@/app/App'
import { useAuth } from '@/features/auth/store'

export async function renderApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const result = render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  )
  await screen.findAllByRole('button')
  return result
}

export const bodyOf = (call?: { init?: RequestInit }) => JSON.parse(String(call?.init?.body))

export const logIn = () =>
  useAuth.setState({
    credentials: { apiUrl: 'https://x.test', idInstance: '1', apiTokenInstance: 't' },
  })
