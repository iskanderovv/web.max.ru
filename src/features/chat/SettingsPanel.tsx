import { LogOut, Moon, Sun } from 'lucide-react'
import { useAccount } from '@/hooks/useAccount'
import { endSession } from '@/lib/session'
import { useTheme } from '@/store/theme'
import { Avatar } from './Avatar'
import { PanelHeader } from './ChatsPanel'

export function SettingsPanel() {
  const account = useAccount()
  const dark = useTheme((s) => s.theme === 'dark')
  const toggleTheme = useTheme((s) => s.toggle)
  const title = account?.phone || 'Telegram account'

  return (
    <section aria-label="Settings" className="flex min-h-0 flex-1 flex-col">
      <PanelHeader title="Settings" />

      <div className="mx-scroll min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4">
        <div className="flex items-center gap-4 rounded-2xl bg-mx-hover p-4">
          <Avatar id={account?.chatId ?? 'me'} title={title} url={account?.avatarUrl} size={64} />
          <div className="min-w-0">
            <p className="truncate text-[17px] font-semibold">{title}</p>
            {account?.username && (
              <p className="truncate text-sm text-mx-secondary">{account.username}</p>
            )}
          </div>
        </div>

        <button
          role="switch"
          aria-checked={dark}
          aria-label="Night mode"
          onClick={toggleTheme}
          className="flex w-full items-center gap-4 rounded-2xl p-3 text-left text-[16px] font-medium transition-colors hover:bg-mx-hover"
        >
          <span className="text-mx-secondary">{dark ? <Moon size={22} /> : <Sun size={22} />}</span>
          <span className="flex-1">Night mode</span>
          <span
            aria-hidden="true"
            className={`relative h-6 w-10 rounded-full transition-colors duration-200 ${
              dark ? 'bg-mx-accent' : 'bg-mx-secondary/40'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform duration-200 ${
                dark ? 'translate-x-4' : ''
              }`}
            />
          </span>
        </button>

        <button
          onClick={endSession}
          className="flex w-full items-center gap-4 rounded-2xl p-3 text-left text-[16px] font-medium text-mx-danger transition-colors hover:bg-mx-hover"
        >
          <LogOut size={22} />
          Log out
        </button>
      </div>
    </section>
  )
}
