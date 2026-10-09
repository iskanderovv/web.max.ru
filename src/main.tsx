import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyTheme, useTheme } from './store/theme'

applyTheme(useTheme.getState().theme)

const queryClient = new QueryClient({
  defaultOptions: {
    mutations: { retry: false },
    // Many calls are metered by the API plan: never refetch just because the tab got focus.
    queries: { retry: false, refetchOnWindowFocus: false },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
