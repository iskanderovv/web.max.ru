import { ArrowLeft, MoreVertical } from 'lucide-react'
import { useState } from 'react'
import { useChatSync } from '@/hooks/useChatSync'
import { usePresence } from '@/hooks/usePresence'
import { isOnline } from '@/lib/presence'
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
      <section className="mx-wallpaper hidden flex-1 place-items-center md:grid">
        <span className="rounded-full bg-mx-pill px-4 py-1 text-sm font-medium text-white backdrop-blur">
          Select a chat to start messaging
        </span>
      </section>
    )
  }
  return <ActiveChat key={chat.chatId} chat={chat} />
}

function ActiveChat({ chat }: { chat: Chat }) {
  useChatSync(chat.chatId)
  const presence = usePresence(chat.chatId, chat.type)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirm, setConfirm] = useState<'clear' | 'delete' | null>(null)
  const [editing, setEditing] = useState<ChatMessage | null>(null)
  const [deleting, setDeleting] = useState<ChatMessage | null>(null)

  return (
    <section className="mx-wallpaper flex min-w-0 flex-1 flex-col">
      <header className="relative flex h-[65px] shrink-0 items-center gap-3 border-b border-mx-border bg-mx-surface px-4">
        <button
          onClick={() => useChats.getState().selectChat(null)}
          aria-label="Back"
          className="rounded-full p-2 text-mx-text hover:bg-mx-hover"
        >
          <ArrowLeft size={20} />
        </button>
        <Avatar id={chat.chatId} title={chat.title} url={chat.avatarUrl} size={40} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[16px] leading-5 font-semibold">{chat.title}</h2>
          <p
            className={`truncate text-[12px] leading-4 ${presence && isOnline(presence) ? 'text-mx-accent' : 'text-mx-secondary'}`}
          >
            {presence ??
              ([chat.username !== chat.title ? chat.username : '', typeLabel(chat.type)]
                .filter(Boolean)
                .join(' · ') ||
                'Telegram')}
          </p>
        </div>

        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Chat actions"
          aria-expanded={menuOpen}
          className="rounded-full p-2.5 text-mx-text hover:bg-mx-hover"
        >
          <MoreVertical size={20} />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div
              role="menu"
              className="mx-pop absolute top-14 right-3 z-20 w-52 rounded-2xl bg-mx-card py-1 text-mx-text shadow-xl ring-1 ring-mx-ring"
            >
              <button
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  setConfirm('clear')
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-mx-hover"
              >
                Clear history
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  setConfirm('delete')
                }}
                className="w-full px-4 py-2 text-left text-sm text-mx-danger hover:bg-mx-hover"
              >
                Delete chat
              </button>
            </div>
          </>
        )}
      </header>

      {chat.messages.length === 0 ? (
        <div className="grid flex-1 place-items-center">
          <span className="rounded-full bg-mx-pill px-4 py-1 text-sm font-medium text-white backdrop-blur">
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
