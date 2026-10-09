import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useChats } from '@/features/chats/store'
import { fakeFetch } from '@tests/helpers/fakeFetch'
import { bodyOf, logIn, renderApp } from '@tests/helpers/app'

describe('sending', () => {
  const setup = () => {
    logIn()
    useChats.getState().ensureChat({ chatId: '55', title: '@bob_test' })
    useChats.getState().selectChat('55')
  }

  it('sends on Enter, shows message and marks it sent', async () => {
    const user = userEvent.setup()
    setup()
    const api = fakeFetch({ sendMessage: { idMessage: 'srv-1' } })
    renderApp()
    await user.type(screen.getByLabelText('Message'), 'hello{Enter}')
    expect(await screen.findByLabelText('Sent')).toBeInTheDocument()
    expect(bodyOf(api.of('sendMessage')[0])).toEqual({ chatId: '55', message: 'hello' })
    expect(useChats.getState().chats['55'].messages[0]).toMatchObject({
      id: 'srv-1',
      text: 'hello',
      direction: 'out',
      status: 'sent',
    })
    expect(screen.getByLabelText('Message')).toHaveValue('')
  })

  it('Shift+Enter adds a new line instead of sending', async () => {
    const user = userEvent.setup()
    setup()
    const api = fakeFetch()
    renderApp()
    await user.type(screen.getByLabelText('Message'), 'a{Shift>}{Enter}{/Shift}b')
    expect(screen.getByLabelText('Message')).toHaveValue('a\nb')
    expect(api.of('sendMessage')).toHaveLength(0)
  })

  it('does not send blank text', async () => {
    const user = userEvent.setup()
    setup()
    const api = fakeFetch()
    renderApp()
    await user.type(screen.getByLabelText('Message'), '   {Enter}')
    expect(api.of('sendMessage')).toHaveLength(0)
    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled()
  })

  it('marks failed and retries', async () => {
    const user = userEvent.setup()
    setup()
    let n = 0
    const api = fakeFetch({
      sendMessage: () => {
        if (n++ === 0) throw new TypeError('Failed to fetch')
        return new Response(JSON.stringify({ idMessage: 'srv-2' }))
      },
    })
    renderApp()
    await user.type(screen.getByLabelText('Message'), 'retry me{Enter}')
    await user.click(await screen.findByRole('button', { name: /failed to send/i }))
    expect(await screen.findByLabelText('Sent')).toBeInTheDocument()
    expect(api.of('sendMessage')).toHaveLength(2)
    expect(useChats.getState().chats['55'].messages).toHaveLength(1)
  })
})
