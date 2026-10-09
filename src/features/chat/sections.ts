export type Section = 'chats' | 'unread' | 'channels' | 'contacts' | 'settings'

export const SECTION_TITLE: Record<Section, string> = {
  chats: 'Chats',
  unread: 'Unread',
  channels: 'Channels',
  contacts: 'Contacts',
  settings: 'Settings',
}
