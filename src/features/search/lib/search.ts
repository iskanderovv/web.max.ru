import { chatTypeSchema, type ChatInfo, type ChatType, type Contact } from '@/api/schemas'
import type { Chat } from '@/features/chats/store'

export interface SearchHit {
  chatId: string
  title: string
  username?: string
  type: ChatType
  phone?: number
}

const USERNAME_RE = /^@?([A-Za-z][A-Za-z0-9_]{4,31})$/
const MAX_HITS = 40

export function usernameQuery(query: string): string | null {
  const m = USERNAME_RE.exec(query.trim())
  return m ? `@${m[1]}` : null
}

const norm = (s: string | undefined) => (s ?? '').toLowerCase().replace(/^@/, '')

function matches(q: string, ...fields: (string | number | undefined)[]) {
  const needle = norm(q.trim())
  if (!needle) return true
  const digits = needle.replace(/\D/g, '')
  return fields.some((f) => {
    if (f === undefined || f === '' || f === 0) return false
    const text = norm(String(f))
    return text.includes(needle) || (digits.length >= 3 && text.replace(/\D/g, '').includes(digits))
  })
}

export function filterAppChats(chats: Chat[], query: string) {
  return chats.filter((c) => matches(query, c.title, c.username))
}

export function buildGlobalHits(
  query: string,
  chats: ChatInfo[],
  contacts: Contact[],
  exclude: Set<string>,
): SearchHit[] {
  const byId = new Map<string, SearchHit>()

  for (const c of chats) {
    if (exclude.has(c.chatId) || !matches(query, c.name, c.username, c.phoneNumber)) continue
    byId.set(c.chatId, {
      chatId: c.chatId,
      title: c.name || c.username || c.chatId,
      username: c.username || undefined,
      type: chatTypeSchema.parse(c.type),
      phone: c.phoneNumber || undefined,
    })
  }
  for (const c of contacts) {
    if (exclude.has(c.chatId) || byId.has(c.chatId)) continue
    if (!matches(query, c.contactName, c.name, c.username, c.phoneNumber)) continue
    byId.set(c.chatId, {
      chatId: c.chatId,
      title: c.contactName || c.name || c.username || c.chatId,
      username: c.username || undefined,
      type: 'user',
      phone: c.phoneNumber || undefined,
    })
  }
  return [...byId.values()].sort((a, b) => a.title.localeCompare(b.title)).slice(0, MAX_HITS)
}
