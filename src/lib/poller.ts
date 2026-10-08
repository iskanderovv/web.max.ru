import type { Notification } from '@/api/schemas'

export interface PollerDeps {
  receive: (timeoutSec: number, signal: AbortSignal) => Promise<Notification | null>
  remove: (receiptId: number, signal: AbortSignal) => Promise<unknown>
  handle: (body: unknown) => void
  onStatus?: (ok: boolean) => void
  receiveTimeoutSec?: number
  minDelayMs?: number
  maxDelayMs?: number
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) return resolve()
    const t = setTimeout(done, ms)
    function done() {
      clearTimeout(t)
      signal.removeEventListener('abort', done)
      resolve()
    }
    signal.addEventListener('abort', done)
  })
}

/**
 * receive -> handle -> delete, forever, until aborted.
 * A notification is deleted even if `handle` throws (otherwise it would block the FIFO queue);
 * failed requests back off exponentially.
 */
export async function runPoller(deps: PollerDeps, signal: AbortSignal) {
  const { receive, remove, handle, onStatus } = deps
  const min = deps.minDelayMs ?? 1000
  const max = deps.maxDelayMs ?? 30_000
  let delay = min

  while (!signal.aborted) {
    try {
      const n = await receive(deps.receiveTimeoutSec ?? 20, signal)
      onStatus?.(true)
      delay = min
      if (!n) continue
      try {
        handle(n.body)
      } catch (e) {
        console.error('Failed to process notification', e)
      }
      await remove(n.receiptId, signal)
    } catch {
      if (signal.aborted) return
      onStatus?.(false)
      await sleep(delay, signal)
      delay = Math.min(delay * 2, max)
    }
  }
}
