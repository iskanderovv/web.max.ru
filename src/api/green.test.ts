import { afterEach, describe, expect, it, vi } from 'vitest'
import incoming from '../../fixtures/receive-incoming-text.json'
import other from '../../fixtures/receive-other-type.json'
import { buildUrl } from './client'
import { ApiError, NetworkError, ValidationError } from './errors'
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
