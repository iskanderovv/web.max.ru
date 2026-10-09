import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
  headers: { source: string; headers: { key: string; value: string }[] }[]
}
const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { engines?: { node?: string } }

const headersFor = (source: string) =>
  Object.fromEntries(
    (vercel.headers.find((h) => h.source === source)?.headers ?? []).map((h) => [h.key, h.value]),
  )

describe('deployment config', () => {
  it('sets baseline security headers on every route', () => {
    const all = headersFor('/(.*)')
    expect(all['X-Content-Type-Options']).toBe('nosniff')
    expect(all['X-Frame-Options']).toBe('DENY')
    expect(all['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(all['Permissions-Policy']).toContain('camera=()')
  })

  it('caches fingerprinted assets for a year', () => {
    expect(headersFor('/assets/(.*)')['Cache-Control']).toBe('public, max-age=31536000, immutable')
  })

  it('pins a Node version that the toolchain supports', () => {
    expect(pkg.engines?.node).toBe('>=22.12.0')
  })
})
