import { vi } from 'vitest'

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>

/**
 * fetch stub routed by GREEN-API method name. `receiveNotification` behaves like a long poll
 * (hangs until aborted) and `getSettings` reports incoming enabled, unless overridden.
 */
export function fakeFetch(handlers: Record<string, Handler | Response | object> = {}) {
  const calls: { method: string; url: string; init?: RequestInit }[] = []
  const fn = vi.fn((url: string, init?: RequestInit) => {
    const method = /\/waInstance\d+\/(\w+)\//.exec(url)?.[1] ?? ''
    calls.push({ method, url, init })
    const h = handlers[method]
    if (typeof h === 'function') return Promise.resolve((h as Handler)(url, init))
    if (h instanceof Response) return Promise.resolve(h.clone())
    if (h !== undefined) return Promise.resolve(new Response(JSON.stringify(h)))
    if (method === 'receiveNotification') {
      return new Promise<Response>((_res, rej) => {
        init?.signal?.addEventListener('abort', () =>
          rej(new DOMException('Aborted', 'AbortError')),
        )
      })
    }
    if (method === 'getChats' || method === 'getContacts')
      return Promise.resolve(new Response('[]'))
    if (method === 'getContactInfo') {
      return Promise.resolve(new Response(JSON.stringify({ lastSeen: 0 })))
    }
    if (method === 'getAccountSettings') return Promise.resolve(new Response('{}'))
    if (method === 'sendTyping') return Promise.resolve(new Response(''))
    if (method === 'getAvatar') {
      return Promise.resolve(new Response(JSON.stringify({ urlAvatar: '' })))
    }
    if (method === 'getChatHistory') return Promise.resolve(new Response('[]'))
    if (method === 'getSettings') {
      return Promise.resolve(new Response(JSON.stringify({ incomingWebhook: 'yes' })))
    }
    return Promise.reject(new Error(`unexpected request: ${method}`))
  })
  vi.stubGlobal('fetch', fn)
  return { fn, calls, of: (method: string) => calls.filter((c) => c.method === method) }
}
