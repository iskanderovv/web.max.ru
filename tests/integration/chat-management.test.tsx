import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useChats } from '@/features/chats/store'
import { fakeFetch } from '@tests/helpers/fakeFetch'
import { logIn, renderApp } from '@tests/helpers/app'

describe('chat management', () => {
  it('deletes a chat after confirmation (and not on cancel)', async () => {
    const user = userEvent.setup()
    logIn()
    useChats.getState().ensureChat({ chatId: '9', title: '@zed_user' })
    useChats.getState().selectChat('9')
    fakeFetch()
    await renderApp()
    await user.click(screen.getByRole('button', { name: 'Chat actions' }))
    await user.click(screen.getByRole('menuitem', { name: /delete chat/i }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(useChats.getState().chats['9']).toBeDefined()

    await user.click(screen.getByRole('button', { name: 'Chat actions' }))
    await user.click(screen.getByRole('menuitem', { name: /delete chat/i }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(useChats.getState().chats['9']).toBeUndefined()
    expect(screen.getByText(/no chats yet/i)).toBeInTheDocument()
  })

  it('clears history but keeps the chat', async () => {
    const user = userEvent.setup()
    logIn()
    useChats.getState().ensureChat({ chatId: '9', title: '@zed_user' })
    useChats
      .getState()
      .addMessage('9', { id: 'm', text: 'old', direction: 'in', timestamp: 1, status: 'sent' })
    useChats.getState().selectChat('9')
    fakeFetch()
    await renderApp()
    await user.click(screen.getByRole('button', { name: 'Chat actions' }))
    await user.click(screen.getByRole('menuitem', { name: /clear history/i }))
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(useChats.getState().chats['9'].messages).toEqual([])
    expect(screen.getByText(/no messages here yet/i)).toBeInTheDocument()
  })
})
