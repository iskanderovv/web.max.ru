import { PanelHeader } from '@/shared/components/PanelHeader'
import { LogOut } from 'lucide-react'
import { useAccount } from '@/features/settings/hooks/useAccount'
import { Avatar } from '@/shared/components/Avatar'

export function SettingsPanel({ onLogout }: { onLogout: () => void }) {
  const account = useAccount()
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
          onClick={onLogout}
          className="flex w-full items-center gap-4 rounded-2xl p-3 text-left text-[16px] font-medium text-mx-danger transition-colors hover:bg-mx-hover"
        >
          <LogOut size={22} />
          Log out
        </button>
      </div>
    </section>
  )
}
