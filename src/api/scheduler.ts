export type Lane = 'user' | 'background'

const ONE_PER_SECOND_MS = 1100
const DEFAULT_METHOD_GAPS: Record<string, number> = {
  getContacts: ONE_PER_SECOND_MS,
  getChats: ONE_PER_SECOND_MS,
  getChatHistory: ONE_PER_SECOND_MS,
  getSettings: ONE_PER_SECOND_MS,
  setSettings: ONE_PER_SECOND_MS,
  getAccountSettings: ONE_PER_SECOND_MS,
  deleteMessage: ONE_PER_SECOND_MS,
  getContactInfo: ONE_PER_SECOND_MS,
}

export const schedulerConfig = {
  gapMs: 120,
  methodGapMs: DEFAULT_METHOD_GAPS as Record<string, number>,
  retryBaseMs: 1000,
  maxRetries: 3,
}

export const configureScheduler = (patch: Partial<typeof schedulerConfig>) =>
  Object.assign(schedulerConfig, patch)

interface Job {
  key?: string
  start: () => void
  abort: () => void
  signal?: AbortSignal
}

const queues: Record<Lane, Job[]> = { user: [], background: [] }
const LANES = ['user', 'background'] as const
let lastStart = -Infinity
const lastStartByKey = new Map<string, number>()
let timer: ReturnType<typeof setTimeout> | undefined

const abortError = () => new DOMException('Aborted', 'AbortError')

function eligibleAt(job: Job) {
  const global = lastStart + schedulerConfig.gapMs
  const gap = job.key ? (schedulerConfig.methodGapMs[job.key] ?? 0) : 0
  const perMethod = gap && job.key ? (lastStartByKey.get(job.key) ?? -Infinity) + gap : -Infinity
  return Math.max(global, perMethod)
}

function dropAborted() {
  for (const lane of LANES) {
    queues[lane] = queues[lane].filter((job) => {
      if (!job.signal?.aborted) return true
      job.abort()
      return false
    })
  }
}

function pick(now: number): { job?: Job; wait: number } {
  let wait = Infinity
  for (const lane of LANES) {
    for (const job of queues[lane]) {
      const at = eligibleAt(job)
      if (at <= now) return { job, wait: 0 }
      wait = Math.min(wait, at - now)
    }
  }
  return { wait }
}

function pump() {
  dropAborted()
  if (timer !== undefined) return
  const { wait } = pick(Date.now())
  if (wait === Infinity) return
  timer = setTimeout(() => {
    timer = undefined
    dropAborted()
    const { job } = pick(Date.now())
    if (job) {
      for (const lane of LANES) {
        const i = queues[lane].indexOf(job)
        if (i >= 0) queues[lane].splice(i, 1)
      }
      lastStart = Date.now()
      if (job.key) lastStartByKey.set(job.key, lastStart)
      job.start()
    }
    pump()
  }, wait)
}

export function schedule<T>(
  lane: Lane,
  task: () => Promise<T>,
  signal?: AbortSignal,
  key?: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal?.aborted) return reject(abortError())
    const job: Job = {
      key,
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
