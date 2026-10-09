import { screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useChats } from '@/features/chats/store'
import { fakeFetch } from '@tests/helpers/fakeFetch'
import { logIn, renderApp } from '@tests/helpers/app'

describe('presence', () => {
  afterEach(() => vi.useRealTimers())

  const openChat = (type?: 'user' | 'bot' | 'channel') => {
    logIn()
    useChats.getState().ensureChat({ chatId: '9', title: '@zed_user', type })
    useChats.getState().selectChat('9')
  }

  it('shows "online" for a fresh lastSeen', async () => {
    openChat('user')
    fakeFetch({ getContactInfo: { lastSeen: Math.floor(Date.now() / 1000) - 10 } })
    await renderApp()
    expect(await screen.findByText('online')).toBeInTheDocument()
  })

  it('shows a last seen time for an older lastSeen', async () => {
    openChat()
    fakeFetch({ getContactInfo: { lastSeen: Math.floor(Date.now() / 1000) - 3 * 86_400 } })
    await renderApp()
    expect(await screen.findByText(/^last seen [A-Z][a-z]{2} \d{1,2}$/)).toBeInTheDocument()
  })

  it('shows "last seen recently" when privacy hides it', async () => {
    openChat('user')
    fakeFetch({ getContactInfo: { lastSeen: 0 } })
    await renderApp()
    expect(await screen.findByText('last seen recently')).toBeInTheDocument()
  })

  it('does not ask for presence of bots and channels', async () => {
    openChat('bot')
    const api = fakeFetch()
    await renderApp()
    expect(screen.getByText(/bot/)).toBeInTheDocument()
    expect(api.of('getContactInfo')).toHaveLength(0)
  })

  it('falls back to username when presence cannot be loaded', async () => {
    openChat('user')
    useChats
      .getState()
      .ensureChat({ chatId: '9', title: 'Zed', username: '@zed_user', type: 'user' })
    fakeFetch({ getContactInfo: () => new Response('{}', { status: 500 }) })
    await renderApp()
    expect(await screen.findByText('@zed_user')).toBeInTheDocument()
  })
})

describe('API quota and presence budget', () => {
  it('looks presence up once per opened chat and does not poll', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    logIn()
    useChats.getState().ensureChat({ chatId: '9', title: 'Zed', type: 'user' })
    useChats.getState().selectChat('9')
    const api = fakeFetch({ getContactInfo: { lastSeen: 0 } })
    await renderApp()
    await screen.findByText('last seen recently')
    await vi.advanceTimersByTimeAsync(10 * 60_000)
    expect(api.of('getContactInfo')).toHaveLength(1)
  })

  it('falls back to the username when the monthly quota is used up, then stops calling', async () => {
    logIn()
    useChats
      .getState()
      .ensureChat({ chatId: '9', title: 'Zed', username: '@zed_user', type: 'user' })
    useChats
      .getState()
      .ensureChat({ chatId: '8', title: 'Amy', username: '@amy_user', type: 'user' })
    useChats.getState().selectChat('9')
    const api = fakeFetch({
      getContactInfo: () =>
        new Response(
          JSON.stringify({
            invokeStatus: {
              method: 'getContactInfo',
              used: 100,
              total: 100,
              status: 'QUOTE_EXCEEDED',
            },
          }),
          { status: 466 },
        ),
    })
    await renderApp()
    expect(await screen.findByText('@zed_user')).toBeInTheDocument()
    await waitFor(() => expect(api.of('getContactInfo').length).toBeGreaterThanOrEqual(1))
    const callsAfterFirst = api.of('getContactInfo').length
    useChats.getState().selectChat('8')
    expect(await screen.findByText('@amy_user')).toBeInTheDocument()
    await new Promise((r) => setTimeout(r, 50))
    expect(api.of('getContactInfo')).toHaveLength(callsAfterFirst)
  })
})
