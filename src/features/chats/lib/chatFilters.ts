import type { Chat } from '../store'

export type ChatFilter = 'chats' | 'unread' | 'channels'

export const CHAT_FILTERS: Record<ChatFilter, (chat: Chat) => boolean> = {
  chats: () => true,
  unread: (chat) => chat.unread > 0,
  channels: (chat) => chat.type === 'channel',
}

export const EMPTY_TEXT: Record<ChatFilter, string> = {
  chats: 'No chats yet. Press + to start one.',
  unread: 'No unread chats.',
  channels: 'No channels opened yet. Find one with search.',
}
