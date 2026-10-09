import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import App from '@/app/App'
import { useAuth } from '@/features/auth/store'

export function renderApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  )
}

export const bodyOf = (call?: { init?: RequestInit }) => JSON.parse(String(call?.init?.body))

export const logIn = () =>
  useAuth.setState({
    credentials: { apiUrl: 'https://x.test', idInstance: '1', apiTokenInstance: 't' },
  })
