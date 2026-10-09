import { Inbox, Megaphone, MessageCircle, Settings, Users, type LucideIcon } from 'lucide-react'
import { useChats } from '@/features/chats/store'
import type { Section } from '@/features/shell/sections'

const MAIN: { id: Section; label: string; icon: LucideIcon }[] = [
  { id: 'chats', label: 'Chats', icon: MessageCircle },
  { id: 'unread', label: 'Unread', icon: Inbox },
  { id: 'channels', label: 'Channels', icon: Megaphone },
]
const PEOPLE = { id: 'contacts' as const, label: 'Contacts', icon: Users }

export function Rail({ section, onSelect }: { section: Section; onSelect: (s: Section) => void }) {
  const hidden = useChats((s) => s.activeChatId !== null)
  const unread = useChats((s) =>
    Object.values(s.chats).reduce((sum, c) => sum + (c.unread > 0 ? 1 : 0), 0),
  )

  const button = (item: { id: Section; label: string; icon: LucideIcon }, badge = 0) => (
    <RailButton
      key={item.id}
      {...item}
      active={section === item.id}
      badge={badge}
      onClick={() => onSelect(item.id)}
    />
  )

  return (
    <nav
      aria-label="Sections"
      className={`shrink-0 items-center justify-around border-t border-mx-border bg-mx-surface px-1 py-1 md:w-[77px] md:flex-col md:justify-start md:gap-[7px] md:border-t-0 md:border-r md:pt-6 md:pb-3 ${
        hidden ? 'hidden md:flex' : 'flex'
      }`}
    >
      {MAIN.map((item) => button(item, item.id === 'chats' ? unread : 0))}
      <div role="separator" className="my-1 hidden h-px w-[52px] bg-mx-border md:block" />
      {button(PEOPLE)}
      <div className="hidden flex-1 md:block" />
      {button({ id: 'settings', label: 'Settings', icon: Settings })}
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
      className={`flex h-[58px] w-[68px] flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] leading-4 transition-colors ${
        active ? 'text-mx-text' : 'text-mx-rail hover:text-mx-text'
      }`}
    >
      <span className="relative">
        <Icon
          size={26}
          strokeWidth={active ? 2.2 : 1.8}
          fill={active && label === 'Chats' ? 'currentColor' : 'none'}
        />
        {badge > 0 && (
          <span className="absolute -top-1.5 -right-3 min-w-[18px] rounded-full bg-mx-action px-1 text-center text-[11px] leading-[18px] font-medium text-white">
            {badge}
          </span>
        )}
      </span>
      {label}
    </button>
  )
}
