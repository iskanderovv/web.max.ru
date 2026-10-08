import { Menu, Pencil, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatListTime } from '@/lib/time'
import { selectSortedChats, useChats } from '@/store/chats'
import { Avatar } from './Avatar'
import { ContactsDialog } from './ContactsDialog'
import { Drawer } from './Drawer'
import { NewContactDialog } from './NewContactDialog'
import { SearchResults } from './SearchResults'

export function Sidebar() {
  const chatMap = useChats((s) => s.chats)
  const activeChatId = useChats((s) => s.activeChatId)
  const [creating, setCreating] = useState(false)
  const [contacts, setContacts] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')

  const chats = useMemo(() => selectSortedChats({ chats: chatMap }), [chatMap])
  const searching = query.trim().length > 0

  return (
    <aside
      className={`relative flex h-full w-full shrink-0 flex-col border-r border-tg-border bg-white md:w-[22rem] ${
        activeChatId ? 'hidden md:flex' : 'flex'
      }`}
    >
      <header className="flex items-center gap-2 px-3 py-2">
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Menu"
          aria-expanded={menuOpen}
          className="rounded-full p-2.5 text-tg-secondary hover:bg-tg-hover"
        >
          <Menu size={22} />
        </button>
        <label className="flex flex-1 items-center gap-2 rounded-full bg-tg-hover px-3 py-2 focus-within:ring-2 focus-within:ring-tg-blue">
          <Search size={18} className="text-tg-secondary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search chats"
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-tg-secondary"
          />
        </label>
      </header>

      {searching ? (
        <SearchResults query={query} onDone={() => setQuery('')} />
      ) : (
        <ul className="tg-scroll flex-1 overflow-y-auto px-2">
          {chats.length === 0 && (
            <li className="p-6 text-center text-sm text-tg-secondary">
              No chats yet. Tap the pencil to start one.
            </li>
          )}
          {chats.map((chat) => {
            const last = chat.messages.at(-1)
            const active = chat.chatId === activeChatId
            return (
              <li key={chat.chatId}>
                <button
                  onClick={() => useChats.getState().selectChat(chat.chatId)}
                  className={`flex w-full items-center gap-3 rounded-xl p-2 text-left ${
                    active ? 'bg-tg-blue text-white' : 'hover:bg-tg-hover'
                  }`}
                >
                  <Avatar id={chat.chatId} title={chat.title} url={chat.avatarUrl} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-medium">{chat.title}</span>
                      {last && (
                        <span
                          className={`shrink-0 text-xs ${active ? 'text-white/80' : 'text-tg-secondary'}`}
                        >
                          {formatListTime(last.timestamp)}
                        </span>
                      )}
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span
                        className={`truncate text-[15px] ${active ? 'text-white/90' : 'text-tg-secondary'}`}
                      >
                        {last
                          ? last.direction === 'out'
                            ? `You: ${last.text}`
                            : last.text
                          : 'No messages'}
                      </span>
                      {chat.unread > 0 && (
                        <span className="min-w-6 shrink-0 rounded-full bg-tg-blue px-1.5 py-0.5 text-center text-xs font-medium text-white">
                          {chat.unread}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <button
        onClick={() => setCreating(true)}
        aria-label="New chat"
        className="absolute right-4 bottom-4 grid size-14 place-items-center rounded-full bg-tg-blue text-white shadow-lg hover:bg-tg-blue-dark"
      >
        <Pencil size={22} />
      </button>

      {menuOpen && (
        <Drawer
          onClose={() => setMenuOpen(false)}
          onNewChat={() => {
            setMenuOpen(false)
            setCreating(true)
          }}
          onContacts={() => {
            setMenuOpen(false)
            setContacts(true)
          }}
        />
      )}
      {creating && <NewContactDialog onClose={() => setCreating(false)} />}
      {contacts && <ContactsDialog onClose={() => setContacts(false)} />}
    </aside>
  )
}
