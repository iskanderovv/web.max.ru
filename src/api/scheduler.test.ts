import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { configureScheduler, schedule, schedulerConfig, sleep } from './scheduler'

const saved = { ...schedulerConfig }
beforeEach(() => configureScheduler({ gapMs: 30 }))
afterEach(() => configureScheduler(saved))

describe('schedule', () => {
  it('spaces task starts by gapMs', async () => {
    const starts: number[] = []
    const t0 = Date.now()
    await Promise.all(
      [1, 2, 3].map(() =>
        schedule('user', async () => {
          starts.push(Date.now() - t0)
        }),
      ),
    )
    expect(starts[1] - starts[0]).toBeGreaterThanOrEqual(25)
    expect(starts[2] - starts[1]).toBeGreaterThanOrEqual(25)
  })

  it('runs user-lane tasks before queued background ones', async () => {
    const order: string[] = []
    const run = (lane: 'user' | 'background', name: string) =>
      schedule(lane, async () => void order.push(name))
    await run('background', 'first') // starts the spacing window
    await Promise.all([run('background', 'bg1'), run('background', 'bg2'), run('user', 'user1')])
    expect(order).toEqual(['first', 'user1', 'bg1', 'bg2'])
  })

  it('user work queued together with background work still goes first', async () => {
    const order: string[] = []
    const run = (lane: 'user' | 'background', name: string) =>
      schedule(lane, async () => void order.push(name))
    await Promise.all([run('background', 'bg'), run('user', 'user')])
    expect(order).toEqual(['user', 'bg'])
  })

  it('does not run a task whose signal was aborted while queued', async () => {
    const ctl = new AbortController()
    const ran = vi.fn()
    const first = schedule('user', async () => 1)
    const queued = schedule('user', async () => ran(), ctl.signal)
    ctl.abort()
    await expect(queued).rejects.toMatchObject({ name: 'AbortError' })
    await first
    await sleep(60)
    expect(ran).not.toHaveBeenCalled()
  })

  it('rejects immediately for an already aborted signal', async () => {
    const ctl = new AbortController()
    ctl.abort()
    await expect(schedule('user', async () => 1, ctl.signal)).rejects.toMatchObject({
      name: 'AbortError',
    })
  })

  it('a failing task does not block the queue', async () => {
    const results = await Promise.allSettled([
      schedule('user', async () => {
        throw new Error('x')
      }),
      schedule('user', async () => 'ok'),
    ])
    expect(results.map((r) => r.status)).toEqual(['rejected', 'fulfilled'])
  })
})

describe('per-method spacing', () => {
  beforeEach(() => configureScheduler({ gapMs: 0, methodGapMs: { slow: 60 } }))
  afterEach(() => configureScheduler({ methodGapMs: saved.methodGapMs }))

  it('spaces calls of the same method but lets other methods through', async () => {
    const t0 = Date.now()
    const at: Record<string, number> = {}
    const run = (name: string, key: string) =>
      schedule('user', async () => void (at[name] = Date.now() - t0), undefined, key)
    await Promise.all([run('s1', 'slow'), run('s2', 'slow'), run('fast', 'fast')])
    expect(at.s2 - at.s1).toBeGreaterThanOrEqual(55)
    expect(at.fast).toBeLessThan(at.s2) // not stuck behind the slow method's wait
  })
})

describe('sleep', () => {
  it('rejects when aborted', async () => {
    const ctl = new AbortController()
    const p = sleep(1000, ctl.signal)
    ctl.abort()
    await expect(p).rejects.toMatchObject({ name: 'AbortError' })
  })
})
