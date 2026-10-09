import { describe, expect, it } from 'vitest'
import { useChats } from '@/features/chats/store'
import { fakeFetch } from '@tests/helpers/fakeFetch'
import { logIn, renderApp } from '@tests/helpers/app'
import { waitFor } from '@testing-library/react'
import { titleFor } from '@/features/shell/hooks/useDocumentTitle'

const addUnread = (chatId: string, unread: number) => {
  useChats.getState().ensureChat({ chatId, title: `Chat ${chatId}` })
  for (let i = 0; i < unread; i++) {
    useChats.getState().addMessage(chatId, {
      id: `${chatId}-${i}`,
      text: 'hi',
      direction: 'in',
      timestamp: 100 + i,
      status: 'sent',
    })
  }
}

describe('document title', () => {
  it('formats the title with the unread count', () => {
    expect(titleFor(0)).toMatch(/^Web Chat: /)
    expect(titleFor(3)).toBe('(3) Web Chat')
  })

  it('shows total unread messages in the tab title and clears it when read', async () => {
    logIn()
    addUnread('1', 2)
    addUnread('2', 1)
    fakeFetch()
    await renderApp()
    await waitFor(() => expect(document.title).toBe('(3) Web Chat'))
    useChats.getState().selectChat('1')
    useChats.getState().selectChat('2')
    await waitFor(() => expect(document.title).toMatch(/^Web Chat: /))
  })
})
