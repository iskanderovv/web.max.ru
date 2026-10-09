import { lazy, Suspense } from 'react'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { useAuth } from '@/features/auth/store'
import { endSession } from './session'

const ChatShell = lazy(() =>
  import('@/features/shell/components/ChatShell').then((m) => ({ default: m.ChatShell })),
)

export default function App() {
  const credentials = useAuth((s) => s.credentials)
  if (!credentials) return <LoginForm />

  return (
    <Suspense fallback={<div className="h-full bg-mx-surface" />}>
      <ChatShell onLogout={endSession} />
    </Suspense>
  )
}
