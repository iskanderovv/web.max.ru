import type { ChatType } from '@/api/schemas'

export function typeLabel(type: ChatType | undefined) {
  switch (type) {
    case 'bot':
      return 'bot'
    case 'channel':
      return 'channel'
    case 'group':
    case 'supergroup':
      return 'group'
    default:
      return ''
  }
}

export const isGroupLike = (type: ChatType | undefined) =>
  type === 'group' || type === 'supergroup' || type === 'channel'
