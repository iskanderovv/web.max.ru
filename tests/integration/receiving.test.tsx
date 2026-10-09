import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { incomingTextNotification as incoming } from '@tests/helpers/payloads'
import { useChats } from '@/features/chats/store'
import { fakeFetch } from '@tests/helpers/fakeFetch'
import { logIn, renderApp } from '@tests/helpers/app'

describe('receiving', () => {
  it('shows an incoming reply in the open chat and deletes the notification', async () => {
    logIn()
    useChats.getState().ensureChat({ chatId: '10000000', title: '@vasilisa' })
    useChats.getState().selectChat('10000000')
    let served = false
    const api = fakeFetch({
      receiveNotification: (_u, init) => {
        if (!served) {
          served = true
          return new Response(JSON.stringify(incoming))
        }
        return new Promise<Response>((_res, rej) =>
          init?.signal?.addEventListener('abort', () =>
            rej(new DOMException('Aborted', 'AbortError')),
          ),
        ) as unknown as Response
      },
      deleteNotification: { result: true, reason: '' },
    })
    renderApp()
    const list = await screen.findByRole('list', { name: 'Messages' })
    expect(await within(list).findByText('Hello from Green-API!')).toBeInTheDocument()
    await waitFor(() => expect(api.of('deleteNotification')).toHaveLength(1))
    expect(api.of('deleteNotification')[0].url).toMatch(/deleteNotification\/t\/1234567$/)
  })

  it('shows unread badge for a chat that is not open', async () => {
    logIn()
    useChats.getState().ensureChat({ chatId: '10000000', title: '@vasilisa' })
    let served = false
    fakeFetch({
      receiveNotification: (_u, init) => {
        if (!served) {
          served = true
          return new Response(JSON.stringify(incoming))
        }
        return new Promise<Response>((_res, rej) =>
          init?.signal?.addEventListener('abort', () =>
            rej(new DOMException('Aborted', 'AbortError')),
          ),
        ) as unknown as Response
      },
      deleteNotification: { result: true, reason: '' },
    })
    renderApp()
    expect(await screen.findByText('Hello from Green-API!')).toBeInTheDocument()
    expect(useChats.getState().chats['10000000'].unread).toBe(1)
  })

  it('warns when incoming notifications are disabled', async () => {
    logIn()
    fakeFetch({ getSettings: { incomingWebhook: 'no' } })
    renderApp()
    expect(await screen.findByRole('alert')).toHaveTextContent(/incoming messages are disabled/i)
  })
})
