import { Check, CheckCheck, CircleAlert, Clock } from 'lucide-react'
import { Fragment, useEffect, useRef } from 'react'
import { useSendMessage } from '@/hooks/useSendMessage'
import { dayKey, dayLabel, formatTime } from '@/lib/time'
import type { Chat, ChatMessage } from '@/store/chats'

export function MessageList({ chat }: { chat: Chat }) {
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
                grouped={!!prev && !newDay && prev.direction === m.direction}
                onRetry={() => retry(chat.chatId, m.id, m.text)}
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
  grouped,
  onRetry,
}: {
  message: ChatMessage
  grouped: boolean
  onRetry: () => void
}) {
  const out = m.direction === 'out'
  return (
    <li className={`flex ${out ? 'justify-end' : 'justify-start'} ${grouped ? '' : 'mt-1.5'}`}>
      <div
        className={`max-w-[min(34rem,85%)] rounded-xl px-2.5 pt-1.5 pb-1 text-[15px] leading-snug shadow-sm ${
          out ? 'bg-tg-out' : 'bg-white'
        } ${out ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
      >
        <span className="break-words whitespace-pre-wrap">{m.text}</span>
        <span
          className={`float-right mt-2 ml-3 flex items-center gap-1 text-xs ${
            out ? 'text-tg-out-meta' : 'text-tg-secondary'
          }`}
        >
          {formatTime(m.timestamp)}
          {out && <Status message={m} onRetry={onRetry} />}
        </span>
      </div>
    </li>
  )
}

function Status({ message, onRetry }: { message: ChatMessage; onRetry: () => void }) {
  if (message.status === 'sending') return <Clock size={13} aria-label="Sending" />
  if (message.status === 'failed') {
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
  if (message.status === 'read') return <CheckCheck size={16} aria-label="Read" />
  return <Check size={14} aria-label={message.status === 'delivered' ? 'Delivered' : 'Sent'} />
}
