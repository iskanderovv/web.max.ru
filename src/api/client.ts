import type { ZodType } from 'zod'
import { ApiError, NetworkError, ValidationError, isAbortError } from './errors'
import { schedule, schedulerConfig, sleep, type Lane } from './scheduler'
import type { Credentials } from './schemas'

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number>
  signal?: AbortSignal
}

/** Builds `{apiUrl}/waInstance{id}/{method}/{token}[/extra]`. */
export function buildUrl(
  c: Credentials,
  method: string,
  extra?: string | number,
  query?: RequestOptions['query'],
) {
  const base = `${c.apiUrl.replace(/\/+$/, '')}/waInstance${c.idInstance}/${method}/${c.apiTokenInstance}`
  const url = extra === undefined ? base : `${base}/${extra}`
  if (!query) return url
  const qs = new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)]))
  return `${url}?${qs}`
}

/** Cosmetic lookups queue behind anything the user did. */
const BACKGROUND_METHODS = new Set([
  'getAvatar',
  'getContactInfo',
  'getChatHistory',
  'getAccountSettings',
  'sendTyping',
])
/** Long-poll: holds a connection for seconds, must not occupy the request budget. */
const UNSCHEDULED_METHODS = new Set(['receiveNotification'])

const laneOf = (method: string): Lane => (BACKGROUND_METHODS.has(method) ? 'background' : 'user')

function retryDelayMs(res: Response, attempt: number) {
  const header = Number(res.headers.get('retry-after'))
  if (Number.isFinite(header) && header > 0) return Math.min(header * 1000, 30_000)
  return schedulerConfig.retryBaseMs * 2 ** attempt
}

export async function request<T>(
  c: Credentials,
  method: string,
  schema: ZodType<T>,
  opts: RequestOptions & { extra?: string | number } = {},
): Promise<T> {
  const url = buildUrl(c, method, opts.extra, opts.query)

  async function fetchOnce(): Promise<Response> {
    try {
      return await fetch(url, {
        method: opts.method ?? 'GET',
        headers: opts.body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        signal: opts.signal,
      })
    } catch (e) {
      if (isAbortError(e)) throw e
      throw new NetworkError('Network error', { cause: e })
    }
  }

  const send = () =>
    UNSCHEDULED_METHODS.has(method) ? fetchOnce() : schedule(laneOf(method), fetchOnce, opts.signal)

  // HTTP 429 means "slow down": wait (Retry-After or exponential) and queue the call again.
  let res = await send()
  for (let attempt = 0; res.status === 429 && attempt < schedulerConfig.maxRetries; attempt++) {
    await sleep(retryDelayMs(res, attempt), opts.signal)
    res = await send()
  }

  const text = await res.text()
  let json: unknown = null
  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      json = text
    }
  }

  if (!res.ok) throw new ApiError(httpMessage(res.status, json), res.status, json)

  const parsed = schema.safeParse(json)
  if (!parsed.success) throw new ValidationError('Unexpected API response', parsed.error.issues)
  return parsed.data
}

function httpMessage(status: number, body: unknown) {
  if (status === 401) return 'Invalid idInstance or apiTokenInstance'
  if (status === 429) return 'Too many requests, try again later'
  if (status === 469) return 'Telegram rate limit reached, try again in a few hours'
  return detailOf(body) || `Request failed (${status})`
}

/** GREEN-API error bodies carry the human text in `message`, `error` or `reason`. */
function detailOf(body: unknown) {
  if (typeof body === 'string') return body.slice(0, 200)
  if (!body || typeof body !== 'object') return ''
  for (const key of ['message', 'error', 'reason']) {
    const v = (body as Record<string, unknown>)[key]
    if (typeof v === 'string' && v) return v
  }
  return ''
}
