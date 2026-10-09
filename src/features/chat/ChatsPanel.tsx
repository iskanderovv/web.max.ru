import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { isGroupLike } from '@/lib/search'
import { formatListTime } from '@/lib/time'
import { selectSortedChats, useChats, type Chat } from '@/store/chats'
import { Avatar } from './Avatar'
import { SearchResults } from './SearchResults'
import { SECTION_TITLE, type Section } from './sections'
import { StatusIcon } from './StatusIcon'

type ChatsSection = Extract<Section, 'chats' | 'unread' | 'channels'>

const FILTERS: Record<ChatsSection, (c: Chat) => boolean> = {
  chats: () => true,
  unread: (c) => c.unread > 0,
  channels: (c) => c.type === 'channel',
}

const EMPTY: Record<ChatsSection, string> = {
  chats: 'No chats yet. Press + to start one.',
  unread: 'No unread chats.',
  channels: 'No channels opened yet. Find one with search.',
}

export function ChatsPanel({
  section,
  onNewChat,
}: {
  section: ChatsSection
  onNewChat: () => void
}) {
  const chatMap = useChats((s) => s.chats)
  const activeChatId = useChats((s) => s.activeChatId)
  const [query, setQuery] = useState('')

  const chats = useMemo(
    () => selectSortedChats({ chats: chatMap }).filter(FILTERS[section]),
    [chatMap, section],
  )
  const searching = query.trim().length > 0

  return (
    <>
      <PanelHeader title={SECTION_TITLE[section]} onAdd={onNewChat} />
      <SearchField label="Search chats" value={query} onChange={setQuery} />

      {searching ? (
        <SearchResults query={query} onDone={() => setQuery('')} />
      ) : (
        <ul className="mx-scroll flex-1 overflow-y-auto">
          {chats.length === 0 && (
            <li className="p-6 text-center text-sm text-mx-secondary">{EMPTY[section]}</li>
          )}
          {chats.map((chat) => (
            <ChatRow key={chat.chatId} chat={chat} active={chat.chatId === activeChatId} />
          ))}
        </ul>
      )}
    </>
  )
}

export function PanelHeader({ title, onAdd }: { title: string; onAdd?: () => void }) {
  return (
    <header className="mt-1.5 flex h-14 shrink-0 items-center justify-between px-4">
      <h1 className="text-[24px] leading-7 font-semibold">{title}</h1>
      {onAdd && (
        <button
          onClick={onAdd}
          aria-label="New chat"
          className="grid size-8 place-items-center rounded-full bg-mx-accent text-white transition-colors hover:bg-mx-accent-dark"
        >
          <Plus size={18} strokeWidth={2.6} />
        </button>
      )}
    </header>
  )
}

export function SearchField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="mx-4 mt-0.5 mb-2 flex h-9 shrink-0 items-center gap-2 rounded-xl bg-mx-hover px-3 focus-within:ring-2 focus-within:ring-mx-accent">
      <Search size={18} className="text-mx-secondary" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search"
        aria-label={label}
        className="w-full bg-transparent text-[15px] outline-none placeholder:text-mx-secondary"
      />
    </label>
  )
}

function ChatRow({ chat, active }: { chat: Chat; active: boolean }) {
  const last = chat.messages.at(-1)
  const preview = last
    ? last.direction === 'out' && isGroupLike(chat.type)
      ? `You: ${last.text}`
      : last.text
    : 'No messages'

  return (
    <li>
      <button
        onClick={() => useChats.getState().selectChat(chat.chatId)}
        className={`flex min-h-[82px] w-full items-center gap-3 px-4 py-[9px] text-left transition-colors hover:bg-mx-card ${
          active ? 'bg-mx-card' : ''
        }`}
      >
        <Avatar id={chat.chatId} title={chat.title} url={chat.avatarUrl} size={64} />
        <span className="min-w-0 flex-1 self-start pt-[1px]">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-[15px] leading-5 font-medium">{chat.title}</span>
            {last && (
              <span className="flex shrink-0 items-center gap-1 text-[13px] leading-4 text-mx-secondary">
                {last.direction === 'out' && (
                  <span
                    className={
                      last.status === 'failed'
                        ? 'text-mx-danger'
                        : last.status === 'sending'
                          ? ''
                          : 'text-mx-accent'
                    }
                  >
                    <StatusIcon status={last.status} label={false} />
                  </span>
                )}
                {formatListTime(last.timestamp)}
              </span>
            )}
          </span>
          <span className="mt-[3px] flex items-start justify-between gap-2">
            <span className="line-clamp-2 min-w-0 text-[15px] leading-5 break-words text-mx-secondary">
              {preview}
            </span>
            {chat.unread > 0 && (
              <span className="mt-0.5 min-w-5 shrink-0 rounded-full bg-mx-accent px-1.5 text-center text-xs leading-5 font-medium text-white">
                {chat.unread}
              </span>
            )}
          </span>
        </span>
      </button>
    </li>
  )
}
