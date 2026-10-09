import { Inbox, Megaphone, MessageCircle, Settings, Users, type LucideIcon } from 'lucide-react'
import { useChats } from '@/store/chats'
import type { Section } from './sections'

const TOP: { id: Section; label: string; icon: LucideIcon }[] = [
  { id: 'chats', label: 'Chats', icon: MessageCircle },
  { id: 'unread', label: 'Unread', icon: Inbox },
  { id: 'channels', label: 'Channels', icon: Megaphone },
  { id: 'contacts', label: 'Contacts', icon: Users },
]

/** MAX-style icon rail: a column on desktop, a bottom bar on phones. */
export function Rail({ section, onSelect }: { section: Section; onSelect: (s: Section) => void }) {
  const hidden = useChats((s) => s.activeChatId !== null)
  const unread = useChats((s) =>
    Object.values(s.chats).reduce((sum, c) => sum + (c.unread > 0 ? 1 : 0), 0),
  )

  return (
    <nav
      aria-label="Sections"
      className={`shrink-0 items-center justify-around border-t border-mx-border bg-mx-surface px-2 py-1 md:w-[76px] md:flex-col md:justify-start md:gap-1 md:border-t-0 md:border-r md:py-3 ${
        hidden ? 'hidden md:flex' : 'flex'
      }`}
    >
      {TOP.map((item) => (
        <RailButton
          key={item.id}
          {...item}
          active={section === item.id}
          badge={item.id === 'chats' ? unread : 0}
          onClick={() => onSelect(item.id)}
        />
      ))}
      <div className="hidden flex-1 md:block" />
      <RailButton
        id="settings"
        label="Settings"
        icon={Settings}
        active={section === 'settings'}
        badge={0}
        onClick={() => onSelect('settings')}
      />
    </nav>
  )
}

function RailButton({
  label,
  icon: Icon,
  active,
  badge,
  onClick,
}: {
  id: Section
  label: string
  icon: LucideIcon
  active: boolean
  badge: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={`relative flex w-16 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] leading-3 font-medium transition-colors ${
        active ? 'text-mx-accent' : 'text-mx-secondary hover:text-mx-text'
      }`}
    >
      <span className="relative">
        <Icon size={24} strokeWidth={active ? 2.4 : 2} />
        {badge > 0 && (
          <span className="absolute -top-1.5 -right-2.5 min-w-4 rounded-full bg-mx-accent px-1 text-center text-[10px] leading-4 font-semibold text-white">
            {badge}
          </span>
        )}
      </span>
      {label}
    </button>
  )
}
