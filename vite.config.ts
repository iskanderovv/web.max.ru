import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const path = (p: string) => fileURLToPath(new URL(p, import.meta.url))

const siteUrl = (process.env.SITE_URL ?? '').replace(/\/+$/, '')

const siteMeta = {
  name: 'site-meta',
  transformIndexHtml: (html: string) =>
    html
      .replaceAll('__SITE_URL__', siteUrl)
      .replace('<!--canonical-->', siteUrl ? `<link rel="canonical" href="${siteUrl}/" />` : ''),
}

export default defineConfig({
  plugins: [react(), tailwindcss(), siteMeta],
  resolve: {
    alias: { '@tests': path('./tests'), '@': path('./src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['./tests/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/main.tsx'],
    },
  },
})
