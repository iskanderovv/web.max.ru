import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useAuth } from '@/features/auth/store'
import { useChats } from '@/features/chats/store'
import { fakeFetch } from '@tests/helpers/fakeFetch'
import { logIn, renderApp } from '@tests/helpers/app'

describe('login', () => {
  async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText('idInstance'), '410022760325')
    await user.type(screen.getByLabelText('apiTokenInstance'), 'secret')
    await user.click(screen.getByRole('button', { name: /connect/i }))
  }

  it('shows validation errors for empty form', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: /connect/i }))
    expect(await screen.findAllByText(/digits only|required|valid url/i)).not.toHaveLength(0)
    expect(useAuth.getState().credentials).toBeNull()
  })

  it('prefills apiUrl from idInstance', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.type(screen.getByLabelText('idInstance'), '410022760325')
    expect(screen.getByLabelText('apiUrl')).toHaveValue('https://4100.api.green-api.com')
  })

  it('logs in when instance is authorized and persists credentials', async () => {
    const user = userEvent.setup()
    fakeFetch({ getStateInstance: { stateInstance: 'authorized' } })
    renderApp()
    await fillAndSubmit(user)
    await waitFor(() => expect(useAuth.getState().credentials?.idInstance).toBe('410022760325'))
    expect(await screen.findByText(/no chats yet/i)).toBeInTheDocument()
    expect(localStorage.getItem('tg-chat-auth')).toContain('410022760325')
  })

  it('rejects an instance that is not authorized', async () => {
    const user = userEvent.setup()
    fakeFetch({ getStateInstance: { stateInstance: 'notAuthorized' } })
    renderApp()
    await fillAndSubmit(user)
    expect(await screen.findByRole('alert')).toHaveTextContent(/not authorized/i)
    expect(useAuth.getState().credentials).toBeNull()
  })

  it('log out also forgets the exhausted-method state of that instance', async () => {
    const user = userEvent.setup()
    const { markExhausted, quotaFor } = await import('@/api/quota')
    markExhausted('getContactInfo', { used: 100, total: 100 })
    fakeFetch()
    logIn()
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Settings' }))
    await user.click(screen.getByRole('button', { name: /log out/i }))
    expect(quotaFor('getContactInfo')).toBeUndefined()
  })

  it('log out clears credentials and chats', async () => {
    const user = userEvent.setup()
    fakeFetch()
    logIn()
    useChats.getState().ensureChat({ chatId: '1', title: 'A' })
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Settings' }))
    await user.click(screen.getByRole('button', { name: /log out/i }))
    expect(useAuth.getState().credentials).toBeNull()
    expect(useChats.getState().chats).toEqual({})
    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument()
  })
})
