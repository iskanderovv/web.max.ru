import { ArrowLeft, MoreVertical } from 'lucide-react'
import { useState } from 'react'
import { useChatSync } from '@/hooks/useChatSync'
import { typeLabel } from '@/lib/search'
import { useChats, type Chat, type ChatMessage } from '@/store/chats'
import { Avatar } from './Avatar'
import { ConfirmDialog } from './ConfirmDialog'
import { DeleteMessageDialog } from './DeleteMessageDialog'
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
  return <ActiveChat key={chat.chatId} chat={chat} />
}

function ActiveChat({ chat }: { chat: Chat }) {
  useChatSync(chat.chatId)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirm, setConfirm] = useState<'clear' | 'delete' | null>(null)
  const [editing, setEditing] = useState<ChatMessage | null>(null)
  const [deleting, setDeleting] = useState<ChatMessage | null>(null)

  return (
    <section className="tg-wallpaper flex min-w-0 flex-1 flex-col">
      <header className="relative flex h-14 shrink-0 items-center gap-3 bg-white px-3 shadow-sm">
        <button
          onClick={() => useChats.getState().selectChat(null)}
          aria-label="Back"
          className="rounded-full p-2 text-tg-secondary hover:bg-tg-hover md:hidden"
        >
          <ArrowLeft size={20} />
        </button>
        <Avatar id={chat.chatId} title={chat.title} url={chat.avatarUrl} size={42} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-medium">{chat.title}</h2>
          <p className="truncate text-sm text-tg-secondary">
            {[chat.username !== chat.title ? chat.username : '', typeLabel(chat.type)]
              .filter(Boolean)
              .join(' · ') || 'Telegram'}
          </p>
        </div>

        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Chat actions"
          aria-expanded={menuOpen}
          className="rounded-full p-2.5 text-tg-secondary hover:bg-tg-hover"
        >
          <MoreVertical size={20} />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div
              role="menu"
              className="absolute top-12 right-3 z-20 w-48 rounded-xl bg-white py-1 shadow-lg ring-1 ring-black/5"
            >
              <button
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  setConfirm('clear')
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-tg-hover"
              >
                Clear history
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  setConfirm('delete')
                }}
                className="w-full px-4 py-2 text-left text-sm text-tg-danger hover:bg-tg-hover"
              >
                Delete chat
              </button>
            </div>
          </>
        )}
      </header>

      {chat.messages.length === 0 ? (
        <div className="grid flex-1 place-items-center">
          <span className="rounded-full bg-black/25 px-4 py-1 text-sm font-medium text-white">
            No messages here yet…
          </span>
        </div>
      ) : (
        <MessageList chat={chat} onEdit={setEditing} onDelete={setDeleting} />
      )}

      <MessageInput
        key={editing?.id ?? 'new'}
        chatId={chat.chatId}
        editing={editing}
        onEditDone={() => setEditing(null)}
      />

      {deleting && (
        <DeleteMessageDialog
          chatId={chat.chatId}
          chatTitle={chat.title}
          message={deleting}
          onClose={() => setDeleting(null)}
        />
      )}
      {confirm === 'delete' && (
        <ConfirmDialog
          title="Delete chat"
          message={`Delete the chat with ${chat.title}? It is removed from this app only; your Telegram history is not affected.`}
          confirmLabel="Delete"
          onConfirm={() => useChats.getState().deleteChat(chat.chatId)}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm === 'clear' && (
        <ConfirmDialog
          title="Clear history"
          message="Remove all messages of this chat from this app? Your Telegram history is not affected."
          confirmLabel="Clear"
          onConfirm={() => useChats.getState().clearHistory(chat.chatId)}
          onClose={() => setConfirm(null)}
        />
      )}
    </section>
  )
}
