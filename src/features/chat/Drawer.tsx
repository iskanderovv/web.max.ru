import { LogOut, Moon, SquarePen, Sun, Users } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { useAccount } from '@/hooks/useAccount'
import { endSession } from '@/lib/session'
import { useTheme } from '@/store/theme'
import { Avatar } from './Avatar'

export function Drawer({
  onClose,
  onNewChat,
  onContacts,
}: {
  onClose: () => void
  onNewChat: () => void
  onContacts: () => void
}) {
  const account = useAccount()
  const dark = useTheme((s) => s.theme === 'dark')
  const toggleTheme = useTheme((s) => s.toggle)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const title = account?.phone || 'Telegram account'

  return (
    <div className="fixed inset-0 z-20">
      <div className="mx-backdrop absolute inset-0 bg-black/40" onClick={onClose} />
      <nav
        aria-label="Main menu"
        className="mx-drawer absolute inset-y-0 left-0 flex w-[19rem] max-w-[85vw] flex-col bg-mx-surface shadow-xl"
      >
        <div className="bg-mx-accent px-5 pt-6 pb-4 text-white">
          <Avatar id={account?.chatId ?? 'me'} title={title} url={account?.avatarUrl} size={64} />
          <p className="mt-3 truncate font-medium">{title}</p>
          {account?.username && (
            <p className="truncate text-sm text-white/80">{account.username}</p>
          )}
        </div>
        <ul className="flex-1 py-2">
          <Item icon={<SquarePen size={22} />} label="New chat" onClick={onNewChat} />
          <Item icon={<Users size={22} />} label="Contacts" onClick={onContacts} />
          <li>
            <button
              role="switch"
              aria-checked={dark}
              aria-label="Night mode"
              onClick={toggleTheme}
              className="flex w-full items-center gap-5 px-5 py-3 text-left text-[15px] font-medium hover:bg-mx-hover"
            >
              <span className="text-mx-secondary">
                {dark ? <Moon size={22} /> : <Sun size={22} />}
              </span>
              <span className="flex-1">Night mode</span>
              <span
                aria-hidden="true"
                className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${
                  dark ? 'bg-mx-accent' : 'bg-mx-secondary/50'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform duration-200 ${
                    dark ? 'translate-x-4' : ''
                  }`}
                />
              </span>
            </button>
          </li>
        </ul>
        <ul className="border-t border-mx-border py-2">
          <Item icon={<LogOut size={22} />} label="Log out" onClick={endSession} />
        </ul>
      </nav>
    </div>
  )
}

function Item({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <li>
      <button
        onClick={onClick}
        className="flex w-full items-center gap-5 px-5 py-3 text-left text-[15px] font-medium hover:bg-mx-hover"
      >
        <span className="text-mx-secondary">{icon}</span>
        {label}
      </button>
    </li>
  )
}
