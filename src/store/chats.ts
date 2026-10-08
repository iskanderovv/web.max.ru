import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const MAX_MESSAGES_PER_CHAT = 500

export type MessageStatus = 'sending' | 'sent' | 'failed'

export interface ChatMessage {
  id: string
  text: string
  direction: 'in' | 'out'
  /** Unix seconds. */
  timestamp: number
  status: MessageStatus
}

export interface Chat {
  chatId: string
  title: string
  username?: string
  messages: ChatMessage[]
  unread: number
  /** Unix seconds of last activity, for sorting. */
  updatedAt: number
}

interface ChatsState {
  chats: Record<string, Chat>
  activeChatId: string | null
  ensureChat: (chat: { chatId: string; title: string; username?: string }) => void
  selectChat: (chatId: string | null) => void
  /** Returns false when a message with the same id already exists. */
  addMessage: (chatId: string, message: ChatMessage) => boolean
  updateMessage: (chatId: string, id: string, patch: Partial<ChatMessage>) => void
  reset: () => void
}

const now = () => Math.floor(Date.now() / 1000)

export const useChats = create<ChatsState>()(
  persist(
    (set, get) => ({
      chats: {},
      activeChatId: null,

      ensureChat: ({ chatId, title, username }) =>
        set((s) => {
          const existing = s.chats[chatId]
          if (existing) {
            const next = {
              ...existing,
              title: title || existing.title,
              username: username ?? existing.username,
            }
            return { chats: { ...s.chats, [chatId]: next } }
          }
          const chat: Chat = { chatId, title, username, messages: [], unread: 0, updatedAt: now() }
          return { chats: { ...s.chats, [chatId]: chat } }
        }),

      selectChat: (chatId) =>
        set((s) => {
          if (!chatId || !s.chats[chatId]) return { activeChatId: chatId }
          return {
            activeChatId: chatId,
            chats: { ...s.chats, [chatId]: { ...s.chats[chatId], unread: 0 } },
          }
        }),

      addMessage: (chatId, message) => {
        const chat = get().chats[chatId]
        if (!chat || chat.messages.some((m) => m.id === message.id)) return false
        const messages = [...chat.messages, message].slice(-MAX_MESSAGES_PER_CHAT)
        const isActive = get().activeChatId === chatId
        set((s) => ({
          chats: {
            ...s.chats,
            [chatId]: {
              ...chat,
              messages,
              updatedAt: message.timestamp,
              unread: message.direction === 'in' && !isActive ? chat.unread + 1 : chat.unread,
            },
          },
        }))
        return true
      },

      updateMessage: (chatId, id, patch) =>
        set((s) => {
          const chat = s.chats[chatId]
          if (!chat) return s
          const messages = chat.messages.map((m) => (m.id === id ? { ...m, ...patch } : m))
          return { chats: { ...s.chats, [chatId]: { ...chat, messages } } }
        }),

      reset: () => set({ chats: {}, activeChatId: null }),
    }),
    { name: 'tg-chat-chats' },
  ),
)

/** Chats sorted by last activity, newest first. */
export const selectSortedChats = (s: Pick<ChatsState, 'chats'>) =>
  Object.values(s.chats).sort((a, b) => b.updatedAt - a.updatedAt)
