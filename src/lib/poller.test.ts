import { describe, expect, it, vi } from 'vitest'
import type { Notification } from '@/api/schemas'
import { runPoller } from './poller'

const note = (receiptId: number): Notification => ({ receiptId, body: { typeWebhook: 'x' } })

function setup(
  receive: (t: number, s: AbortSignal) => Promise<Notification | null>,
  extra: { handle?: (b: unknown) => void } = {},
) {
  const controller = new AbortController()
  const remove = vi.fn(async () => ({ result: true }))
  const handle = vi.fn(extra.handle ?? (() => {}))
  const onStatus = vi.fn()
  const done = runPoller(
    { receive, remove, handle, onStatus, minDelayMs: 1, maxDelayMs: 4 },
    controller.signal,
  )
  return { controller, remove, handle, onStatus, done }
}

describe('runPoller', () => {
  it('handles then deletes each notification, skips empty polls', async () => {
    const queue: (Notification | null)[] = [note(1), null, note(2)]
    let ctl: AbortController
    const s = setup(async () => {
      const next = queue.shift()
      if (next === undefined) {
        ctl.abort()
        return null
      }
      return next
    })
    ctl = s.controller
    await s.done
    expect(s.handle).toHaveBeenCalledTimes(2)
    expect(s.remove.mock.calls.map((c: unknown[]) => c[0])).toEqual([1, 2])
  })

  it('still deletes when handler throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    let calls = 0
    const s = setup(
      async () => {
        if (calls++ === 0) return note(7)
        s.controller.abort()
        return null
      },
      {
        handle: () => {
          throw new Error('boom')
        },
      },
    )
    await s.done
    expect(s.remove).toHaveBeenCalledWith(7, expect.anything())
  })

  it('backs off on errors, reports status and recovers', async () => {
    let calls = 0
    const s = setup(async () => {
      calls++
      if (calls <= 3) throw new Error('network')
      if (calls === 4) return note(9)
      s.controller.abort()
      return null
    })
    await s.done
    expect(s.onStatus.mock.calls.map((c: unknown[]) => c[0])).toEqual([
      false,
      false,
      false,
      true,
      true,
    ])
    expect(s.remove).toHaveBeenCalledWith(9, expect.anything())
  })

  it('stops promptly when aborted mid-request', async () => {
    const s = setup(
      (_t, signal) =>
        new Promise((_res, rej) => {
          signal.addEventListener('abort', () => rej(new DOMException('Aborted', 'AbortError')))
        }),
    )
    s.controller.abort()
    await expect(s.done).resolves.toBeUndefined()
    expect(s.handle).not.toHaveBeenCalled()
  })
})
