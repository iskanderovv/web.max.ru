export type Lane = 'user' | 'background'

export const schedulerConfig = {
  /** Minimum spacing between request starts. Keeps bursts under the API rate limit. */
  gapMs: 250,
  /** First retry delay after HTTP 429; doubles each attempt (or `Retry-After` wins). */
  retryBaseMs: 1000,
  maxRetries: 3,
}

export const configureScheduler = (patch: Partial<typeof schedulerConfig>) =>
  Object.assign(schedulerConfig, patch)

interface Job {
  start: () => void
  abort: () => void
  signal?: AbortSignal
}

const queues: Record<Lane, Job[]> = { user: [], background: [] }
let lastStart = -Infinity
let timer: ReturnType<typeof setTimeout> | undefined

export const abortError = () => new DOMException('Aborted', 'AbortError')

function nextJob(): Job | undefined {
  for (const lane of ['user', 'background'] as const) {
    const q = queues[lane]
    while (q.length) {
      const job = q.shift()!
      if (job.signal?.aborted) {
        job.abort()
        continue
      }
      return job
    }
  }
  return undefined
}

const hasJobs = () => queues.user.length > 0 || queues.background.length > 0

function pump() {
  if (timer !== undefined || !hasJobs()) return
  const wait = Math.max(0, lastStart + schedulerConfig.gapMs - Date.now())
  timer = setTimeout(() => {
    timer = undefined
    const job = nextJob()
    if (job) {
      lastStart = Date.now()
      job.start()
    }
    pump()
  }, wait)
}

/**
 * Starts tasks at most one per `gapMs`, user-facing lane first, so background lookups
 * (avatars, presence, names, sync) can never starve or burst ahead of a user action.
 */
export function schedule<T>(lane: Lane, task: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal?.aborted) return reject(abortError())
    const job: Job = {
      signal,
      start: () => {
        signal?.removeEventListener('abort', onAbort)
        task().then(resolve, reject)
      },
      abort: () => reject(abortError()),
    }
    const onAbort = () => {
      const q = queues[lane]
      const i = q.indexOf(job)
      if (i >= 0) {
        q.splice(i, 1)
        reject(abortError())
      }
    }
    signal?.addEventListener('abort', onAbort, { once: true })
    queues[lane].push(job)
    pump()
  })
}

/** Abortable delay. */
export function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(abortError())
    const t = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(t)
      reject(abortError())
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
