import { useEffect } from 'react'
import { useChats } from '@/features/chats/store'

export const APP_TITLE = 'Web Chat'
const BASE_TITLE = 'Web Chat: GREEN-API messenger client'

export function titleFor(unread: number) {
  return unread > 0 ? `(${unread}) ${APP_TITLE}` : BASE_TITLE
}

export function useDocumentTitle() {
  const unread = useChats((s) => Object.values(s.chats).reduce((sum, c) => sum + c.unread, 0))

  useEffect(() => {
    document.title = titleFor(unread)
    return () => {
      document.title = BASE_TITLE
    }
  }, [unread])
}
