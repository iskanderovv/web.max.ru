import { describe, expect, it } from 'vitest'
import { buildGlobalHits, usernameQuery } from '@/features/search/lib/search'

const chats = [
  { chatId: '1', name: 'Ann Lee', type: 'user', username: '@ann', phoneNumber: 998901112233 },
  { chatId: '2', name: 'Helper', type: 'bot', username: '@helper_bot', phoneNumber: 0 },
  { chatId: '-3', name: 'News', type: 'channel', username: '@news_ch', phoneNumber: 0 },
  { chatId: '-4', name: 'Weird', type: 'something-new', username: '', phoneNumber: 0 },
]
const contacts = [
  { chatId: '1', contactName: 'Ann L.', name: 'ann', type: 'user' },
  {
    chatId: '7',
    contactName: 'Zoya Only Contact',
    name: 'zoya',
    type: 'user',
    phoneNumber: 998907776655,
  },
]

describe('usernameQuery', () => {
  it.each([
    ['@botfather', '@botfather'],
    ['botfather', '@botfather'],
    ['  @Some_User1 ', '@Some_User1'],
  ])('accepts %s', (input, out) => expect(usernameQuery(input)).toBe(out))

  it.each(['', '@ab', '123abc', 'two words', '@' + 'a'.repeat(40)])('rejects %j', (input) =>
    expect(usernameQuery(input)).toBeNull(),
  )
})

describe('buildGlobalHits', () => {
  it('matches name, username and phone digits across chats and contacts', () => {
    const ids = (q: string) => buildGlobalHits(q, chats, contacts, new Set()).map((h) => h.chatId)
    expect(ids('ann')).toEqual(['1'])
    expect(ids('@helper')).toEqual(['2'])
    expect(ids('news')).toEqual(['-3'])
    expect(ids('7776')).toEqual(['7'])
    expect(ids('99890111')).toEqual(['1'])
  })

  it('includes contacts that have no dialog and dedupes by chatId', () => {
    const hits = buildGlobalHits('', chats, contacts, new Set())
    expect(hits.map((h) => h.chatId).sort()).toEqual(['-3', '-4', '1', '2', '7'].sort())
    expect(hits.find((h) => h.chatId === '1')?.title).toBe('Ann Lee')
  })

  it('excludes chats already open in the app', () => {
    const hits = buildGlobalHits('', chats, contacts, new Set(['1', '2']))
    expect(hits.map((h) => h.chatId)).not.toContain('1')
    expect(hits.map((h) => h.chatId)).not.toContain('2')
  })

  it('falls back to user for unknown chat types', () => {
    expect(buildGlobalHits('weird', chats, [], new Set())[0].type).toBe('user')
  })
})
