import '@testing-library/jest-dom/vitest'
import { beforeEach } from 'vitest'
import { resetQuotaState } from '@/api/quota'
import { configureScheduler } from '@/api/scheduler'

// No artificial spacing/backoff in tests; scheduler.test.ts configures its own values.
configureScheduler({ gapMs: 0, methodGapMs: {}, retryBaseMs: 1 })

beforeEach(() => resetQuotaState())
