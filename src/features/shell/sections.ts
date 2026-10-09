import type { ChatFilter } from '@/features/chats/lib/chatFilters'

export type Section = ChatFilter | 'contacts' | 'settings'

export const SECTION_TITLE: Record<Section, string> = {
  chats: 'Chats',
  unread: 'Unread',
  channels: 'Channels',
  contacts: 'Contacts',
  settings: 'Settings',
}
