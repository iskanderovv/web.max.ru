import { describe, expect, it } from 'vitest'
import { parseRecipient } from '@/features/contacts/lib/recipient'

describe('parseRecipient', () => {
  it.each([
    ['@akbar_iskanderov', { username: '@akbar_iskanderov' }],
    ['akbar_iskanderov', { username: '@akbar_iskanderov' }],
    ['998901234567', { phoneNumber: 998901234567 }],
    ['+998 (90) 123-45-67', { phoneNumber: 998901234567 }],
  ])('parses %s', (input, expected) => {
    expect(parseRecipient(input)).toEqual(expected)
  })

  it.each(['', '   ', 'ab', '@a', '123', '12345678901234567890', '99890abc', 'bad name'])(
    'rejects %j',
    (input) => {
      expect(parseRecipient(input)).toBeNull()
    },
  )
})
