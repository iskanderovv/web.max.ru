import '@testing-library/jest-dom/vitest'
import { configureScheduler } from '@/api/scheduler'

// No artificial spacing/backoff in tests; scheduler.test.ts configures its own values.
configureScheduler({ gapMs: 0, retryBaseMs: 1 })
