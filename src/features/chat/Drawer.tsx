import { LogOut, SquarePen, Users } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { phoneFromWid, useSettings } from '@/hooks/useSettings'
import { endSession } from '@/lib/session'
import { useAuth } from '@/store/auth'
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
  const idInstance = useAuth((s) => s.credentials?.idInstance ?? '')
  const settings = useSettings()
  const phone = phoneFromWid(settings.data?.wid)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-20">
      <div className="tg-backdrop absolute inset-0 bg-black/40" onClick={onClose} />
      <nav
        aria-label="Main menu"
        className="tg-drawer absolute inset-y-0 left-0 flex w-[19rem] max-w-[85vw] flex-col bg-white shadow-xl"
      >
        <div className="bg-tg-blue px-5 pt-6 pb-4 text-white">
          <Avatar id={idInstance} title={phone ?? 'Me'} size={64} />
          <p className="mt-3 font-medium">{phone ?? 'Telegram account'}</p>
          <p className="text-sm text-white/80">Instance {idInstance}</p>
        </div>
        <ul className="flex-1 py-2">
          <Item icon={<SquarePen size={22} />} label="New chat" onClick={onNewChat} />
          <Item icon={<Users size={22} />} label="Contacts" onClick={onContacts} />
        </ul>
        <ul className="border-t border-tg-border py-2">
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
        className="flex w-full items-center gap-5 px-5 py-3 text-left text-[15px] font-medium hover:bg-tg-hover"
      >
        <span className="text-tg-secondary">{icon}</span>
        {label}
      </button>
    </li>
  )
}
