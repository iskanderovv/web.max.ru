import { LoginForm } from '@/features/auth/components/LoginForm'
import { useAuth } from '@/features/auth/store'
import { ChatShell } from '@/features/shell/components/ChatShell'
import { endSession } from './session'

export default function App() {
  const credentials = useAuth((s) => s.credentials)
  return credentials ? <ChatShell onLogout={endSession} /> : <LoginForm />
}
