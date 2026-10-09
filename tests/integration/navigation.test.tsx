import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useChats } from '@/features/chats/store'
import { fakeFetch } from '@tests/helpers/fakeFetch'
import { logIn, renderApp } from '@tests/helpers/app'

describe('rail sections', () => {
  it('rail switches between sections and marks the current one', async () => {
    const user = userEvent.setup()
    logIn()
    fakeFetch()
    await renderApp()
    const rail = screen.getByRole('navigation', { name: 'Sections' })
    expect(within(rail).getByRole('button', { name: 'Chats' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await user.click(within(rail).getByRole('button', { name: 'Contacts' }))
    expect(within(rail).getByRole('button', { name: 'Contacts' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('region', { name: 'Contacts' })).toBeInTheDocument()
    await user.click(within(rail).getByRole('button', { name: 'Chats' }))
    expect(screen.queryByRole('region', { name: 'Contacts' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Chats' })).toBeInTheDocument()
  })

  it('Unread and Channels sections filter the chat list', async () => {
    const user = userEvent.setup()
    logIn()
    const add = (id: string, title: string, type: 'user' | 'channel', unread: boolean) => {
      useChats.getState().ensureChat({ chatId: id, title, type })
      useChats.getState().addMessage(id, {
        id: `m${id}`,
        text: 'hi',
        direction: 'in',
        timestamp: 100,
        status: 'sent',
      })
      if (!unread) useChats.getState().selectChat(id)
    }
    add('1', 'Quiet Person', 'user', false)
    add('2', 'Loud Person', 'user', true)
    add('-3', 'News Channel', 'channel', true)
    useChats.getState().selectChat(null)
    fakeFetch()
    await renderApp()
    const rail = screen.getByRole('navigation', { name: 'Sections' })
    await user.click(within(rail).getByRole('button', { name: 'Unread' }))
    expect(screen.getByText('Loud Person')).toBeInTheDocument()
    expect(screen.getByText('News Channel')).toBeInTheDocument()
    expect(screen.queryByText('Quiet Person')).not.toBeInTheDocument()
    await user.click(within(rail).getByRole('button', { name: 'Channels' }))
    expect(screen.getByText('News Channel')).toBeInTheDocument()
    expect(screen.queryByText('Loud Person')).not.toBeInTheDocument()
  })
})
