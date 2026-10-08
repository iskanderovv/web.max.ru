import { LoginForm } from '@/features/auth/LoginForm'
import { useAuth } from '@/store/auth'

export default function App() {
  const credentials = useAuth((s) => s.credentials)
  const logout = useAuth((s) => s.logout)

  if (!credentials) return <LoginForm />

  return (
    <main className="grid h-full place-items-center">
      <div className="space-y-3 text-center">
        <p className="text-sm text-slate-600">Connected to instance {credentials.idInstance}</p>
        <button onClick={logout} className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-white">
          Log out
        </button>
      </div>
    </main>
  )
}
