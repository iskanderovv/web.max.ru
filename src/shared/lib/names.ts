import type { ContactInfo } from '@/api/schemas'

export const isHandleLike = (title: string) => !title || /^@/.test(title) || /^\+?\d+$/.test(title)

export const realNameOf = (info: Pick<ContactInfo, 'contactName' | 'name'> | undefined) =>
  (info?.contactName || info?.name || '').trim()
