import { isGroupLike } from '@/shared/lib/chatType'
import { ChevronDown, CircleAlert } from 'lucide-react'
import { Fragment, useEffect, useRef, useState } from 'react'
import { useSendMessage } from '@/features/chats/hooks/useSendMessage'
import { canEdit } from '@/features/chats/lib/messageRules'
import { dayKey, dayLabel, formatTime } from '@/shared/lib/time'
import type { Chat, ChatMessage } from '@/features/chats/store'
import { StatusIcon } from '@/features/chats/components/StatusIcon'

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
    <div className="mx-scroll flex-1 overflow-y-auto">
      <ol className="mx-auto flex max-w-[732px] flex-col gap-0.5 px-4 py-4" aria-label="Messages">
        {chat.messages.map((m, i) => {
          const prev = chat.messages[i - 1]
          const next = chat.messages[i + 1]
          const newDay = !prev || dayKey(prev.timestamp) !== dayKey(m.timestamp)
          const withPrev = !!prev && !newDay && sameRun(prev, m)
          const withNext =
            !!next && dayKey(next.timestamp) === dayKey(m.timestamp) && sameRun(m, next)
          const pos: Pos = withPrev ? (withNext ? 'middle' : 'last') : withNext ? 'first' : 'single'
          return (
            <Fragment key={m.id}>
              {newDay && (
                <li className="my-2 self-center">
                  <span className="rounded-full bg-mx-pill px-3 py-0.5 text-sm font-medium text-white backdrop-blur">
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
                pos={pos}
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

type Pos = 'single' | 'first' | 'middle' | 'last'

const sameRun = (a: ChatMessage, b: ChatMessage) =>
  a.direction === b.direction && (a.direction === 'out' || a.author === b.author)

function Bubble({
  message: m,
  showAuthor,
  pos,
  onRetry,
  onEdit,
  onDelete,
}: {
  message: ChatMessage
  showAuthor: boolean
  pos: Pos
  onRetry: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const out = m.direction === 'out'
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <li
      className={`flex ${out ? 'justify-end' : 'justify-start'} ${pos === 'single' || pos === 'first' ? 'mt-1.5' : ''}`}
    >
      <div
        onContextMenu={(e) => {
          e.preventDefault()
          setMenuOpen(true)
        }}
        data-pos={pos}
        className={`group mx-bubble relative max-w-[min(34rem,78%)] text-[16px] leading-[22px] ${
          out ? 'mx-bubble-out' : 'mx-bubble-in'
        }`}
      >
        <button
          type="button"
          aria-label="Message actions"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="absolute top-1 right-1 rounded-full bg-black/25 p-0.5 text-white opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100 focus:opacity-100"
        >
          <ChevronDown size={16} />
        </button>

        {showAuthor && m.author && (
          <span className="block pr-5 text-sm font-medium text-mx-link">{m.author}</span>
        )}
        <span className="break-words whitespace-pre-wrap">{m.text}</span>
        <span
          className="float-right mt-1.5 ml-3 flex items-center gap-1 text-[12px] leading-4"
          style={{ color: 'var(--mx-bubble-time)' }}
        >
          {m.edited && <span>edited</span>}
          {formatTime(m.timestamp)}
          {out && (
            <span style={{ color: 'var(--mx-out-tick)' }}>
              <Status message={m} onRetry={onRetry} />
            </span>
          )}
        </span>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div
              role="menu"
              className={`absolute top-6 z-20 w-44 rounded-xl bg-mx-card py-1 text-mx-text shadow-lg ring-1 ring-mx-ring ${
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
      className={`w-full px-4 py-2 text-left text-sm hover:bg-mx-hover ${danger ? 'text-mx-danger' : ''}`}
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
      className="text-mx-danger"
    >
      <CircleAlert size={15} />
    </button>
  )
}
