import { ChevronDown, CircleAlert } from 'lucide-react'
import { Fragment, useEffect, useRef, useState } from 'react'
import { useSendMessage } from '@/hooks/useSendMessage'
import { canEdit } from '@/lib/messageRules'
import { isGroupLike } from '@/lib/search'
import { dayKey, dayLabel, formatTime } from '@/lib/time'
import type { Chat, ChatMessage } from '@/store/chats'
import { StatusIcon } from './StatusIcon'

export function MessageList({
  chat,
  onEdit,
  onDelete,
}: {
  chat: Chat
  onEdit: (m: ChatMessage) => void
  onDelete: (m: ChatMessage) => void
}) {
  const { retry } = useSendMessage()
  const endRef = useRef<HTMLDivElement>(null)
  const count = chat.messages.length

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' })
  }, [count, chat.chatId])

  return (
    <div className="tg-scroll flex-1 overflow-y-auto">
      <ol className="mx-auto flex max-w-3xl flex-col gap-1 px-3 py-3" aria-label="Messages">
        {chat.messages.map((m, i) => {
          const prev = chat.messages[i - 1]
          const newDay = !prev || dayKey(prev.timestamp) !== dayKey(m.timestamp)
          return (
            <Fragment key={m.id}>
              {newDay && (
                <li className="my-2 self-center">
                  <span className="rounded-full bg-black/25 px-3 py-0.5 text-sm font-medium text-white">
                    {dayLabel(m.timestamp)}
                  </span>
                </li>
              )}
              <Bubble
                message={m}
                showAuthor={
                  isGroupLike(chat.type) &&
                  m.direction === 'in' &&
                  (!prev || prev.direction !== 'in' || prev.author !== m.author || newDay)
                }
                grouped={!!prev && !newDay && prev.direction === m.direction}
                onRetry={() => retry(chat.chatId, m.id, m.text)}
                onEdit={() => onEdit(m)}
                onDelete={() => onDelete(m)}
              />
            </Fragment>
          )
        })}
      </ol>
      <div ref={endRef} />
    </div>
  )
}

function Bubble({
  message: m,
  showAuthor,
  grouped,
  onRetry,
  onEdit,
  onDelete,
}: {
  message: ChatMessage
  showAuthor: boolean
  grouped: boolean
  onRetry: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const out = m.direction === 'out'
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <li className={`flex ${out ? 'justify-end' : 'justify-start'} ${grouped ? '' : 'mt-1.5'}`}>
      <div
        onContextMenu={(e) => {
          e.preventDefault()
          setMenuOpen(true)
        }}
        className={`group relative max-w-[min(34rem,85%)] rounded-xl px-2.5 pt-1.5 pb-1 text-[15px] leading-snug shadow-sm ${
          out ? 'bg-tg-out' : 'bg-tg-surface'
        } ${out ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
      >
        <button
          type="button"
          aria-label="Message actions"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="absolute top-0.5 right-0.5 rounded-full bg-inherit p-0.5 text-tg-secondary opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100 focus:opacity-100"
        >
          <ChevronDown size={16} />
        </button>

        {showAuthor && m.author && (
          <span className="block pr-5 text-sm font-medium text-tg-blue">{m.author}</span>
        )}
        <span className="break-words whitespace-pre-wrap">{m.text}</span>
        <span
          className={`float-right mt-2 ml-3 flex items-center gap-1 text-xs ${
            out ? 'text-tg-out-meta' : 'text-tg-secondary'
          }`}
        >
          {m.edited && <span>edited</span>}
          {formatTime(m.timestamp)}
          {out && <Status message={m} onRetry={onRetry} />}
        </span>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div
              role="menu"
              className={`absolute top-6 z-20 w-40 rounded-xl bg-tg-surface py-1 shadow-lg ring-1 ring-tg-ring ${
                out ? 'right-0' : 'left-0'
              }`}
            >
              {canEdit(m) && (
                <MenuItem
                  label="Edit"
                  onClick={() => {
                    setMenuOpen(false)
                    onEdit()
                  }}
                />
              )}
              <MenuItem
                label="Copy text"
                onClick={() => {
                  setMenuOpen(false)
                  void navigator.clipboard?.writeText(m.text).catch(() => {})
                }}
              />
              <MenuItem
                label="Delete"
                danger
                onClick={() => {
                  setMenuOpen(false)
                  onDelete()
                }}
              />
            </div>
          </>
        )}
      </div>
    </li>
  )
}

function MenuItem({
  label,
  onClick,
  danger,
}: {
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={`w-full px-4 py-2 text-left text-sm hover:bg-tg-hover ${danger ? 'text-tg-danger' : ''}`}
    >
      {label}
    </button>
  )
}

function Status({ message, onRetry }: { message: ChatMessage; onRetry: () => void }) {
  if (message.status !== 'failed') return <StatusIcon status={message.status} />
  return (
    <button
      type="button"
      onClick={onRetry}
      aria-label="Failed to send. Retry"
      title="Failed to send. Click to retry"
      className="text-tg-danger"
    >
      <CircleAlert size={15} />
    </button>
  )
}
