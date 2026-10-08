import { LoginForm } from '@/features/auth/LoginForm'
import { ChatShell } from '@/features/chat/ChatShell'
import { useAuth } from '@/store/auth'

export default function App() {
  const credentials = useAuth((s) => s.credentials)
  return credentials ? <ChatShell /> : <LoginForm />
}
