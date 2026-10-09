import { afterEach, describe, expect, it, vi } from 'vitest'
import incoming from '../../fixtures/receive-incoming-text.json'
import other from '../../fixtures/receive-other-type.json'
import { buildUrl } from './client'
import { ApiError, NetworkError, QuotaError, ValidationError } from './errors'
import { quotaFor, resetQuotaState } from './quota'
import { configureScheduler } from './scheduler'
import { createGreenApi } from './green'
import { notificationSchema, parseIncomingText, type Credentials } from './schemas'

const creds: Credentials = {
  apiUrl: 'https://4100.api.green-api.com',
  idInstance: '410022760325',
  apiTokenInstance: 'tok',
}

function mockFetch(status: number, body: unknown) {
  const fn = vi
    .fn()
    .mockResolvedValue(
      new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }),
    )
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => vi.unstubAllGlobals())

describe('buildUrl', () => {
  it('builds method url', () => {
    expect(buildUrl(creds, 'sendMessage')).toBe(
      'https://4100.api.green-api.com/waInstance410022760325/sendMessage/tok',
    )
  })

  it('adds extra segment and query, trims trailing slash', () => {
    const c = { ...creds, apiUrl: 'https://x.test/' }
    expect(buildUrl(c, 'deleteNotification', 42)).toBe(
      'https://x.test/waInstance410022760325/deleteNotification/tok/42',
    )
    expect(buildUrl(c, 'receiveNotification', undefined, { receiveTimeout: 20 })).toBe(
      'https://x.test/waInstance410022760325/receiveNotification/tok?receiveTimeout=20',
    )
  })
})

describe('createGreenApi', () => {
  it('sendMessage posts chatId and message', async () => {
    const fetchMock = mockFetch(200, { idMessage: 'abc' })
    const res = await createGreenApi(creds).sendMessage('8019310179', 'hi')
    expect(res).toEqual({ idMessage: 'abc' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/sendMessage/tok')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ chatId: '8019310179', message: 'hi' })
  })

  it('checkAccount works with username', async () => {
    const fetchMock = mockFetch(200, {
      exist: true,
      chatId: '8019310179',
      username: '@akbar_iskanderov',
      phoneNumber: 0,
      fromCache: false,
    })
    const res = await createGreenApi(creds).checkAccount({ username: '@akbar_iskanderov' })
    expect(res).toMatchObject({ exist: true, chatId: '8019310179' })
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ username: '@akbar_iskanderov' })
  })

  it('checkAccount: exist=false has empty chatId', async () => {
    mockFetch(200, { exist: false, chatId: '' })
    const res = await createGreenApi(creds).checkAccount({ phoneNumber: 998901234567 })
    expect(res.exist).toBe(false)
  })

  it('checkAccount: 200 rate limit reply becomes ApiError', async () => {
    mockFetch(200, { error: 'rate_limit_exceeded', retryAfter: 7200 })
    await expect(createGreenApi(creds).checkAccount({ phoneNumber: 1 })).rejects.toBeInstanceOf(
      ApiError,
    )
  })

  it('receiveNotification: empty queue (`null` body) returns null', async () => {
    mockFetch(200, 'null')
    expect(await createGreenApi(creds).receiveNotification()).toBeNull()
  })

  it('receiveNotification: parses fixture', async () => {
    mockFetch(200, incoming)
    const n = await createGreenApi(creds).receiveNotification()
    expect(n?.receiptId).toBe(1234567)
  })

  it('deleteNotification uses DELETE with receiptId', async () => {
    const fetchMock = mockFetch(200, { result: true, reason: '' })
    await createGreenApi(creds).deleteNotification(77)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/deleteNotification\/tok\/77$/)
    expect(init.method).toBe('DELETE')
  })

  it('maps 401 to friendly ApiError', async () => {
    mockFetch(401, { message: 'x' })
    const err = await createGreenApi(creds)
      .getStateInstance()
      .catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(401)
    expect(err.message).toMatch(/idInstance/)
  })

  it('maps fetch failure to NetworkError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(createGreenApi(creds).getStateInstance()).rejects.toBeInstanceOf(NetworkError)
  })

  it('rejects unexpected shape with ValidationError', async () => {
    mockFetch(200, { nope: true })
    await expect(createGreenApi(creds).sendMessage('1', 'x')).rejects.toBeInstanceOf(
      ValidationError,
    )
  })
})

describe('parseIncomingText', () => {
  it('extracts text message', () => {
    expect(parseIncomingText(incoming.body)).toEqual({
      idMessage: '126543123451133331119',
      chatId: '10000000',
      senderName: 'Vasilisa Premudraya',
      text: 'Hello from Green-API!',
      timestamp: 1763115112,
    })
  })

  it('ignores non-text notifications', () => {
    expect(notificationSchema.safeParse(other).success).toBe(true)
    expect(parseIncomingText(other.body)).toBeNull()
  })

  it('ignores non-text incoming messages', () => {
    const img = structuredClone(incoming.body) as Record<string, any>
    img.messageData = { typeMessage: 'imageMessage' }
    expect(parseIncomingText(img)).toBeNull()
  })
})

describe('rate limiting (HTTP 429)', () => {
  const tooMany = (retryAfter?: string) =>
    new Response('{}', { status: 429, headers: retryAfter ? { 'retry-after': retryAfter } : {} })

  it('retries after 429 and succeeds', async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce(tooMany())
      .mockResolvedValueOnce(tooMany())
      .mockResolvedValueOnce(new Response(JSON.stringify([{ chatId: '1', name: 'A' }])))
    vi.stubGlobal('fetch', fn)
    const contacts = await createGreenApi(creds).getContacts()
    expect(contacts).toHaveLength(1)
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('gives up with a friendly error after the retry limit', async () => {
    const fn = vi.fn().mockImplementation(async () => tooMany())
    vi.stubGlobal('fetch', fn)
    const err = await createGreenApi(creds)
      .getContacts()
      .catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(429)
    expect(err.message).toMatch(/too many requests/i)
    expect(fn).toHaveBeenCalledTimes(4) // first try + 3 retries
  })

  it('does not retry other errors', async () => {
    const fn = vi.fn().mockResolvedValue(new Response('{}', { status: 500 }))
    vi.stubGlobal('fetch', fn)
    await expect(createGreenApi(creds).getContacts()).rejects.toBeInstanceOf(ApiError)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('an aborted request stops retrying', async () => {
    const ctl = new AbortController()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => tooMany('5')),
    )
    const p = createGreenApi(creds).getAvatar('1', ctl.signal)
    setTimeout(() => ctl.abort(), 20)
    await expect(p).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('long-poll receiveNotification bypasses the request spacing', async () => {
    configureScheduler({ gapMs: 500 })
    try {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(async () => new Response('null')),
      )
      const t0 = Date.now()
      const api = createGreenApi(creds)
      await Promise.all([api.receiveNotification(), api.receiveNotification()])
      expect(Date.now() - t0).toBeLessThan(200)
    } finally {
      configureScheduler({ gapMs: 0 })
    }
  })
})

describe('monthly quota (HTTP 466)', () => {
  const quotaBody = (method: string) =>
    new Response(
      JSON.stringify({ invokeStatus: { method, used: 100, total: 100, status: 'QUOTE_EXCEEDED' } }),
      { status: 466 },
    )

  it('turns 466 into a QuotaError with the numbers', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(quotaBody('getContactInfo')))
    const err = await createGreenApi(creds)
      .getContactInfo('1')
      .catch((e) => e)
    expect(err).toBeInstanceOf(QuotaError)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 466, method: 'getContactInfo', used: 100, total: 100 })
    expect(err.message).toMatch(/100\/100/)
  })

  it('does not retry 466 and stops calling the exhausted method, but not others', async () => {
    const fn = vi
      .fn()
      .mockImplementation(async (url: string) =>
        url.includes('getContactInfo')
          ? quotaBody('getContactInfo')
          : new Response(JSON.stringify({ urlAvatar: '' })),
      )
    vi.stubGlobal('fetch', fn)
    const api = createGreenApi(creds)
    await expect(api.getContactInfo('1')).rejects.toBeInstanceOf(QuotaError)
    expect(fn).toHaveBeenCalledTimes(1)
    await expect(api.getContactInfo('2')).rejects.toBeInstanceOf(QuotaError)
    expect(fn).toHaveBeenCalledTimes(1) // no network call the second time
    await expect(api.getAvatar('1')).resolves.toBe('')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('remembers exhaustion across reloads within the month, forgets it next month', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(quotaBody('checkAccount')))
    return createGreenApi(creds)
      .checkAccount({ phoneNumber: 1 })
      .catch(() => {
        expect(JSON.parse(localStorage.getItem('tg-chat-quota')!).methods.checkAccount).toEqual({
          used: 100,
          total: 100,
        })
        expect(quotaFor('checkAccount')).toBeDefined()
        const saved = JSON.parse(localStorage.getItem('tg-chat-quota')!)
        localStorage.setItem('tg-chat-quota', JSON.stringify({ ...saved, month: '1999-1' }))
        resetQuotaState() // simulates a fresh page load...
        localStorage.setItem('tg-chat-quota', JSON.stringify({ ...saved, month: '1999-1' }))
        expect(quotaFor('checkAccount')).toBeUndefined() // ...in a later month
      })
  })
})
