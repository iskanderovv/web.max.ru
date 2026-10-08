import { describe, expect, it } from 'vitest'
import { createSpacer } from './throttle'

describe('createSpacer', () => {
  it('runs tasks sequentially, spaced apart, and keeps going after a failure', async () => {
    const run = createSpacer(20)
    const starts: number[] = []
    const t0 = Date.now()
    const task =
      (fail = false) =>
      async () => {
        starts.push(Date.now() - t0)
        if (fail) throw new Error('x')
        return 'ok'
      }
    const results = await Promise.allSettled([run(task()), run(task(true)), run(task())])
    expect(results.map((r) => r.status)).toEqual(['fulfilled', 'rejected', 'fulfilled'])
    expect(starts[1] - starts[0]).toBeGreaterThanOrEqual(15)
    expect(starts[2] - starts[1]).toBeGreaterThanOrEqual(15)
  })
})
