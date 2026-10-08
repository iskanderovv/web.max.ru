import { useChats } from '@/store/chats'

export function ChatWindow() {
  const chat = useChats((s) => (s.activeChatId ? s.chats[s.activeChatId] : undefined))

  if (!chat) {
    return (
      <section className="grid flex-1 place-items-center text-sm text-slate-500">
        Select a chat or start a new one
      </section>
    )
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <h2 className="font-semibold">{chat.title}</h2>
      </header>
      <div className="flex-1 overflow-y-auto p-4">
        {chat.messages.length === 0 && (
          <p className="text-center text-sm text-slate-500">No messages yet</p>
        )}
      </div>
    </section>
  )
}
