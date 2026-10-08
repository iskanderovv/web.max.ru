import type { Recipient } from '@/api/green'

const USERNAME_RE = /^@?([A-Za-z][A-Za-z0-9_]{4,31})$/

/** Parses "new chat" input: `@username` or a phone number in any common notation. */
export function parseRecipient(input: string): Recipient | null {
  const value = input.trim()
  if (!value) return null

  const user = USERNAME_RE.exec(value)
  if (user) return { username: `@${user[1]}` }

  if (/^\+?[\d\s()-]+$/.test(value)) {
    const digits = value.replace(/\D/g, '')
    if (digits.length >= 7 && digits.length <= 15) return { phoneNumber: Number(digits) }
  }
  return null
}
