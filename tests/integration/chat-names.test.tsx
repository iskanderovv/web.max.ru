import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useChats } from '@/features/chats/store'
import { fakeFetch } from '@tests/helpers/fakeFetch'
import { bodyOf, logIn, renderApp } from '@tests/helpers/app'

describe('chat names', () => {
  it('replaces a @username title with the real first and last name', async () => {
    logIn()
    useChats.getState().ensureChat({ chatId: '9', title: '@zed_user', type: 'user' })
    useChats.getState().ensureChat({ chatId: '8', title: 'Already Named', type: 'user' })
    useChats.getState().ensureChat({ chatId: '-7', title: '@some_group', type: 'supergroup' })
    const api = fakeFetch({
      getContactInfo: { lastSeen: 0, name: 'zed', contactName: 'Zed Alpha' },
    })
    await renderApp()
    await waitFor(() => expect(useChats.getState().chats['9'].title).toBe('Zed Alpha'))
    expect(useChats.getState().chats['8'].title).toBe('Already Named')
    expect(useChats.getState().chats['-7'].title).toBe('@some_group')
    expect(api.of('getContactInfo').map((c) => bodyOf(c).chatId)).not.toContain('8')
    expect(api.of('getContactInfo').map((c) => bodyOf(c).chatId)).not.toContain('-7')
    expect(useChats.getState().chats['9'].username).toBeUndefined()
  })

  it('keeps the handle when no name is available and does not ask again', async () => {
    logIn()
    useChats.getState().ensureChat({ chatId: '9', title: '@zed_user', type: 'user' })
    fakeFetch({ getContactInfo: { lastSeen: 0 } })
    await renderApp()
    await waitFor(() => expect(useChats.getState().chats['9'].titleChecked).toBe(true))
    expect(useChats.getState().chats['9'].title).toBe('@zed_user')
  })

  it('uses the real name when a @username lookup opens a chat', async () => {
    const user = userEvent.setup()
    logIn()
    fakeFetch({
      getChats: [],
      getContacts: [],
      checkAccount: { exist: true, chatId: '55', username: '@some_person' },
      getContactInfo: { lastSeen: 0, name: 'Some Person' },
    })
    await renderApp()
    await user.type(screen.getByLabelText('Search chats'), '@some_person')
    await user.click(await screen.findByRole('button', { name: /search @some_person/i }))
    await waitFor(() => expect(useChats.getState().activeChatId).toBe('55'))
    expect(useChats.getState().chats['55']).toMatchObject({
      title: 'Some Person',
      username: '@some_person',
    })
  })
})
