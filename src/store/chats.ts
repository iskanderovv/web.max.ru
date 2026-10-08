import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const MAX_MESSAGES_PER_CHAT = 500

/** `sent`/`delivered` render one check, `read` two. */
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

const DELIVERY_RANK = { sent: 0, delivered: 1, read: 2 } as const

export interface ChatMessage {
  id: string
  text: string
  direction: 'in' | 'out'
  /** Unix seconds. */
  timestamp: number
  status: MessageStatus
  edited?: boolean
}

export interface Chat {
  chatId: string
  title: string
  username?: string
  messages: ChatMessage[]
  unread: number
  /** Profile photo URL; `''` = none, `undefined` = not looked up yet. */
  avatarUrl?: string
  historyLoaded?: boolean
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
  deleteMessage: (chatId: string, id: string) => void
  editMessageText: (chatId: string, id: string, text: string) => void
  deleteChat: (chatId: string) => void
  clearHistory: (chatId: string) => void
  setAvatar: (chatId: string, url: string) => void
  /** Imports server history into an empty chat (never merges into existing messages). */
  importHistory: (chatId: string, messages: ChatMessage[]) => void
  /** Raises `sent -> delivered -> read` for known outgoing messages; never downgrades. */
  applyDelivery: (chatId: string, delivery: Record<string, 'delivered' | 'read'>) => void
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

      deleteMessage: (chatId, id) =>
        set((s) => {
          const chat = s.chats[chatId]
          if (!chat) return s
          const messages = chat.messages.filter((m) => m.id !== id)
          return { chats: { ...s.chats, [chatId]: { ...chat, messages } } }
        }),

      editMessageText: (chatId, id, text) =>
        set((s) => {
          const chat = s.chats[chatId]
          if (!chat) return s
          const messages = chat.messages.map((m) =>
            m.id === id ? { ...m, text, edited: true } : m,
          )
          return { chats: { ...s.chats, [chatId]: { ...chat, messages } } }
        }),

      deleteChat: (chatId) =>
        set((s) => {
          const { [chatId]: _removed, ...rest } = s.chats
          return { chats: rest, activeChatId: s.activeChatId === chatId ? null : s.activeChatId }
        }),

      clearHistory: (chatId) =>
        set((s) => {
          const chat = s.chats[chatId]
          if (!chat) return s
          return { chats: { ...s.chats, [chatId]: { ...chat, messages: [], unread: 0 } } }
        }),

      setAvatar: (chatId, url) =>
        set((s) => {
          const chat = s.chats[chatId]
          return chat ? { chats: { ...s.chats, [chatId]: { ...chat, avatarUrl: url } } } : s
        }),

      importHistory: (chatId, messages) =>
        set((s) => {
          const chat = s.chats[chatId]
          if (!chat || chat.messages.length > 0) return s
          const last = messages.at(-1)
          return {
            chats: {
              ...s.chats,
              [chatId]: {
                ...chat,
                historyLoaded: true,
                messages: messages.slice(-MAX_MESSAGES_PER_CHAT),
                updatedAt: last?.timestamp ?? chat.updatedAt,
              },
            },
          }
        }),

      applyDelivery: (chatId, delivery) =>
        set((s) => {
          const chat = s.chats[chatId]
          if (!chat) return s
          let changed = false
          const messages = chat.messages.map((m) => {
            const next = delivery[m.id]
            if (m.direction !== 'out' || !next) return m
            if (m.status !== 'sent' && m.status !== 'delivered' && m.status !== 'read') return m
            if (DELIVERY_RANK[next] <= DELIVERY_RANK[m.status]) return m
            changed = true
            return { ...m, status: next }
          })
          return changed ? { chats: { ...s.chats, [chatId]: { ...chat, messages } } } : s
        }),

      reset: () => set({ chats: {}, activeChatId: null }),
    }),
    { name: 'tg-chat-chats' },
  ),
)

/** Chats sorted by last activity, newest first. */
export const selectSortedChats = (s: Pick<ChatsState, 'chats'>) =>
  Object.values(s.chats).sort((a, b) => b.updatedAt - a.updatedAt)
