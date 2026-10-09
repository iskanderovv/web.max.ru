import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, renderHook, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '@/features/auth/store'
import { useChats } from '@/features/chats/store'
import { fakeFetch } from '@tests/helpers/fakeFetch'
import { BACKGROUND_SYNC_MS, useDeliverySync } from '@/features/chats/hooks/useDeliverySync'
import { IN_VIEW_DWELL_MS, useInView } from '@/shared/hooks/useInView'

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
)

class FakeObserver {
  static instances: FakeObserver[] = []
  disconnected = false
  private cb: (entries: { isIntersecting: boolean }[]) => void
  constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
    this.cb = cb
    FakeObserver.instances.push(this)
  }
  observe() {}
  disconnect() {
    this.disconnected = true
  }
  emit(isIntersecting: boolean) {
    this.cb([{ isIntersecting }])
  }
}

describe('useInView', () => {
  function Probe() {
    const { ref, seen } = useInView<HTMLDivElement>()
    return <div ref={ref}>{seen ? 'seen' : 'unseen'}</div>
  }

  beforeEach(() => {
    vi.useFakeTimers()
    FakeObserver.instances = []
    vi.stubGlobal('IntersectionObserver', FakeObserver)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('counts an element as seen only after it stays in view for the dwell time', () => {
    render(<Probe />)
    const io = FakeObserver.instances[0]
    expect(screen.getByText('unseen')).toBeInTheDocument()
    act(() => io.emit(true))
    act(() => void vi.advanceTimersByTime(IN_VIEW_DWELL_MS - 1))
    expect(screen.getByText('unseen')).toBeInTheDocument()
    act(() => void vi.advanceTimersByTime(2))
    expect(screen.getByText('seen')).toBeInTheDocument()
    expect(io.disconnected).toBe(true)
  })

  it('ignores an element that scrolls past quickly', () => {
    render(<Probe />)
    const io = FakeObserver.instances[0]
    act(() => io.emit(true))
    act(() => void vi.advanceTimersByTime(100))
    act(() => io.emit(false))
    act(() => void vi.advanceTimersByTime(IN_VIEW_DWELL_MS * 2))
    expect(screen.getByText('unseen')).toBeInTheDocument()
  })

  it('stops observing on unmount', () => {
    const { unmount } = render(<Probe />)
    unmount()
    expect(FakeObserver.instances[0].disconnected).toBe(true)
  })

  it('is immediately seen when IntersectionObserver is unavailable', () => {
    vi.unstubAllGlobals()
    render(<Probe />)
    expect(screen.getByText('seen')).toBeInTheDocument()
  })
})

describe('useDeliverySync', () => {
  const NOW = Math.floor(Date.now() / 1000)

  beforeEach(() => {
    vi.useFakeTimers()
    useAuth.setState({
      credentials: { apiUrl: 'https://x.test', idInstance: '1', apiTokenInstance: 't' },
    })
    useChats.getState().reset()
    useChats.getState().ensureChat({ chatId: '5', title: 'Quiet' })
    useChats.getState().addMessage('5', {
      id: 'srv-1',
      text: 'hi',
      direction: 'out',
      timestamp: NOW,
      status: 'sent',
    })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    Object.defineProperty(document, 'hidden', { value: false, configurable: true })
  })

  const history = [
    {
      type: 'outgoing',
      idMessage: 'srv-1',
      timestamp: NOW,
      typeMessage: 'textMessage',
      textMessage: 'hi',
      statusMessage: 'read',
    },
  ]

  it('periodically upgrades the mark of chats that are not open', async () => {
    const api = fakeFetch({ getChatHistory: history })
    renderHook(() => useDeliverySync(), { wrapper })
    expect(api.of('getChatHistory')).toHaveLength(0)
    await act(async () => void (await vi.advanceTimersByTimeAsync(BACKGROUND_SYNC_MS + 50)))
    expect(api.of('getChatHistory')).toHaveLength(1)
    expect(useChats.getState().chats['5'].messages[0].status).toBe('read')
  })

  it('does nothing while the tab is hidden', async () => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true })
    const api = fakeFetch({ getChatHistory: history })
    renderHook(() => useDeliverySync(), { wrapper })
    await act(async () => void (await vi.advanceTimersByTimeAsync(BACKGROUND_SYNC_MS * 3)))
    expect(api.of('getChatHistory')).toHaveLength(0)
  })

  it('stops after unmount', async () => {
    const api = fakeFetch({ getChatHistory: history })
    const { unmount } = renderHook(() => useDeliverySync(), { wrapper })
    unmount()
    await act(async () => void (await vi.advanceTimersByTimeAsync(BACKGROUND_SYNC_MS * 3)))
    expect(api.of('getChatHistory')).toHaveLength(0)
  })
})
