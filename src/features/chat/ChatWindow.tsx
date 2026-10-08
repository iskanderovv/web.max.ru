import { ArrowLeft } from 'lucide-react'
import { useChats } from '@/store/chats'
import { Avatar } from './Avatar'
import { MessageInput } from './MessageInput'
import { MessageList } from './MessageList'

export function ChatWindow() {
  const chat = useChats((s) => (s.activeChatId ? s.chats[s.activeChatId] : undefined))

  if (!chat) {
    return (
      <section className="tg-wallpaper hidden flex-1 place-items-center md:grid">
        <span className="rounded-full bg-black/25 px-4 py-1 text-sm font-medium text-white">
          Select a chat to start messaging
        </span>
      </section>
    )
  }

  return (
    <section className="tg-wallpaper flex min-w-0 flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 bg-white px-3 shadow-sm">
        <button
          onClick={() => useChats.getState().selectChat(null)}
          aria-label="Back"
          className="rounded-full p-2 text-tg-secondary hover:bg-tg-hover md:hidden"
        >
          <ArrowLeft size={20} />
        </button>
        <Avatar id={chat.chatId} title={chat.title} size={42} />
        <div className="min-w-0">
          <h2 className="truncate font-medium">{chat.title}</h2>
          <p className="truncate text-sm text-tg-secondary">
            {chat.username && chat.username !== chat.title ? chat.username : 'Telegram'}
          </p>
        </div>
      </header>

      {chat.messages.length === 0 ? (
        <div className="grid flex-1 place-items-center">
          <span className="rounded-full bg-black/25 px-4 py-1 text-sm font-medium text-white">
            No messages here yet…
          </span>
        </div>
      ) : (
        <MessageList chat={chat} />
      )}

      <MessageInput key={chat.chatId} chatId={chat.chatId} />
    </section>
  )
}
