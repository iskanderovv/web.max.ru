import { useMemo } from 'react'
import { Avatar } from '@/shared/components/Avatar'
import { isGroupLike } from '@/shared/lib/chatType'
import { formatListTime } from '@/shared/lib/time'
import { CHAT_FILTERS, EMPTY_TEXT, type ChatFilter } from '../lib/chatFilters'
import { selectSortedChats, useChats, type Chat } from '../store'
import { StatusIcon } from './StatusIcon'

export function ChatList({ filter }: { filter: ChatFilter }) {
  const chatMap = useChats((s) => s.chats)
  const activeChatId = useChats((s) => s.activeChatId)
  const chats = useMemo(
    () => selectSortedChats({ chats: chatMap }).filter(CHAT_FILTERS[filter]),
    [chatMap, filter],
  )

  return (
    <ul className="mx-scroll flex-1 overflow-y-auto">
      {chats.length === 0 && (
        <li className="p-6 text-center text-sm text-mx-secondary">{EMPTY_TEXT[filter]}</li>
      )}
      {chats.map((chat) => (
        <ChatRow key={chat.chatId} chat={chat} active={chat.chatId === activeChatId} />
      ))}
    </ul>
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
              <span className="mt-0.5 min-w-5 shrink-0 rounded-full bg-mx-action px-1.5 text-center text-xs leading-5 font-medium text-white">
                {chat.unread}
              </span>
            )}
          </span>
        </span>
      </button>
    </li>
  )
}
