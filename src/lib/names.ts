import type { ContactInfo } from '@/api/schemas'

/** A title that is only a handle or a number: the person's real name is worth looking up. */
export const isHandleLike = (title: string) => !title || /^@/.test(title) || /^\+?\d+$/.test(title)

/** First/last name as the user sees it in Telegram: address-book name first. */
export const realNameOf = (info: Pick<ContactInfo, 'contactName' | 'name'> | undefined) =>
  (info?.contactName || info?.name || '').trim()
