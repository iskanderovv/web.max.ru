import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const html = readFileSync('index.html', 'utf8')
const meta = (attr: 'name' | 'property', key: string) =>
  new RegExp(`<meta[^>]*${attr}="${key}"[^>]*content="([^"]*)"`, 's').exec(html)?.[1]

describe('index.html SEO essentials', () => {
  it('has a concise, descriptive title', () => {
    const title = /<title>([^<]+)<\/title>/.exec(html)?.[1] ?? ''
    expect(title.length).toBeGreaterThan(10)
    expect(title.length).toBeLessThanOrEqual(60)
    expect(title).not.toMatch(/telegram chat/i)
  })

  it('has a meta description of a useful length', () => {
    const description = meta('name', 'description') ?? ''
    expect(description.length).toBeGreaterThanOrEqual(70)
    expect(description.length).toBeLessThanOrEqual(160)
  })

  it('declares language, viewport and robots', () => {
    expect(html).toMatch(/<html lang="en"/)
    expect(meta('name', 'viewport')).toContain('width=device-width')
    expect(meta('name', 'robots')).toBe('index, follow')
  })

  it('has complete Open Graph and Twitter cards with a sized image', () => {
    for (const key of ['og:title', 'og:description', 'og:type', 'og:image']) {
      expect(meta('property', key), key).toBeTruthy()
    }
    expect(meta('property', 'og:image:width')).toBe('1200')
    expect(meta('property', 'og:image:height')).toBe('630')
    expect(meta('name', 'twitter:card')).toBe('summary_large_image')
    expect(meta('name', 'twitter:title')).toBeTruthy()
  })

  it('has valid JSON-LD for a web application', () => {
    const raw = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)?.[1] ?? ''
    const data = JSON.parse(raw)
    expect(data['@type']).toBe('WebApplication')
    expect(data.name).toBeTruthy()
  })

  it('provides icons, a noscript fallback and a crawlable robots.txt', () => {
    expect(html).toMatch(/rel="icon"/)
    expect(html).toMatch(/rel="apple-touch-icon"/)
    expect(html).toMatch(/<noscript>[^<]+<\/noscript>/)
    expect(readFileSync('public/robots.txt', 'utf8')).toMatch(/User-agent: \*\s+Allow: \//)
  })

  it('keeps a canonical placeholder that the build fills in from SITE_URL', () => {
    expect(html).toContain('<!--canonical-->')
    expect(html).toContain('__SITE_URL__/og-image.png')
  })
})
