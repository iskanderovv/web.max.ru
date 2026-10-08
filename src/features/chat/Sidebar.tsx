import { LogOut, SquarePen } from 'lucide-react'
import { useMemo, useState } from 'react'
import { endSession } from '@/lib/session'
import { selectSortedChats, useChats } from '@/store/chats'
import { NewChatDialog } from './NewChatDialog'

export function Sidebar() {
  const chatMap = useChats((s) => s.chats)
  const chats = useMemo(() => selectSortedChats({ chats: chatMap }), [chatMap])
  const activeChatId = useChats((s) => s.activeChatId)
  const [creating, setCreating] = useState(false)

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-r border-slate-200 bg-white">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h1 className="font-semibold">Chats</h1>
        <div className="flex gap-1">
          <button
            onClick={() => setCreating(true)}
            aria-label="New chat"
            className="rounded-full p-2 text-slate-600 hover:bg-slate-100"
          >
            <SquarePen size={18} />
          </button>
          <button
            onClick={endSession}
            aria-label="Log out"
            className="rounded-full p-2 text-slate-600 hover:bg-slate-100"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <ul className="flex-1 overflow-y-auto">
        {chats.length === 0 && (
          <li className="p-6 text-center text-sm text-slate-500">No chats yet. Start a new one.</li>
        )}
        {chats.map((chat) => {
          const last = chat.messages.at(-1)
          return (
            <li key={chat.chatId}>
              <button
                onClick={() => useChats.getState().selectChat(chat.chatId)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 ${
                  chat.chatId === activeChatId ? 'bg-sky-50' : ''
                }`}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sky-500 text-sm font-medium text-white">
                  {chat.title.replace('@', '').charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{chat.title}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {last?.text ?? 'No messages'}
                  </span>
                </span>
                {chat.unread > 0 && (
                  <span className="rounded-full bg-sky-500 px-2 py-0.5 text-xs text-white">
                    {chat.unread}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      {creating && <NewChatDialog onClose={() => setCreating(false)} />}
    </aside>
  )
}
