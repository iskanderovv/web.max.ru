import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { fakeFetch } from '@tests/helpers/fakeFetch'
import { bodyOf, logIn, renderApp } from '@tests/helpers/app'

describe('settings', () => {
  it('settings panel shows the account photo, phone, username and actions', async () => {
    const user = userEvent.setup()
    logIn()
    const api = fakeFetch({
      getAccountSettings: {
        chatId: '777',
        phone: '998885880331',
        username: '@my_account',
        avatar: 'https://img.test/me.jpg',
      },
    })
    await renderApp()
    await user.click(screen.getByRole('button', { name: 'Settings' }))
    const panel = screen.getByRole('region', { name: 'Settings' })
    expect(await within(panel).findByText('+998885880331')).toBeInTheDocument()
    expect(within(panel).getByText('@my_account')).toBeInTheDocument()
    expect(panel.querySelector('img')).toHaveAttribute('src', 'https://img.test/me.jpg')
    expect(within(panel).queryByText(/instance/i)).not.toBeInTheDocument()
    expect(api.of('getContactInfo')).toHaveLength(0)
    expect(within(panel).queryByRole('switch')).not.toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: 'Log out' })).toBeInTheDocument()
  })

  it('settings falls back to a generic title when account info is unavailable', async () => {
    const user = userEvent.setup()
    logIn()
    fakeFetch({ getAccountSettings: { chatId: '777', phone: '998885880331', avatar: '' } })
    await renderApp()
    await user.click(screen.getByRole('button', { name: 'Settings' }))
    const panel = screen.getByRole('region', { name: 'Settings' })
    expect(await within(panel).findByText('+998885880331')).toBeInTheDocument()
    expect(panel.querySelector('img')).toBeNull()
  })
})

describe('notification settings banner', () => {
  it('offers to turn on read receipts and sends setSettings', async () => {
    const user = userEvent.setup()
    logIn()
    const api = fakeFetch({
      getSettings: { incomingWebhook: 'yes', outgoingWebhook: 'no' },
      setSettings: { saveSettings: true },
    })
    await renderApp()
    expect(await screen.findByText(/read receipts .* are off/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Turn on' }))
    await waitFor(() => expect(api.of('setSettings')).toHaveLength(1))
    expect(bodyOf(api.of('setSettings')[0])).toEqual({
      incomingWebhook: 'yes',
      outgoingWebhook: 'yes',
    })
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Turn on' })).not.toBeInTheDocument(),
    )
  })

  it('shows nothing when both notification types are on', async () => {
    logIn()
    fakeFetch({ getSettings: { incomingWebhook: 'yes', outgoingWebhook: 'yes' } })
    await renderApp()
    await screen.findByText(/no chats yet/i)
    expect(screen.queryByRole('button', { name: 'Turn on' })).not.toBeInTheDocument()
  })

  it('shows an error when the settings change fails', async () => {
    const user = userEvent.setup()
    logIn()
    fakeFetch({
      getSettings: { incomingWebhook: 'no' },
      setSettings: () => new Response('{}', { status: 500 }),
    })
    await renderApp()
    expect(await screen.findByRole('alert')).toHaveTextContent(/incoming messages are disabled/i)
    await user.click(screen.getByRole('button', { name: 'Turn on' }))
    expect(await screen.findByText(/could not change settings/i)).toBeInTheDocument()
  })
})
