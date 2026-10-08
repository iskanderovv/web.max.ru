/** Runs async tasks one after another with at least `gapMs` between starts (rate limiting). */
export function createSpacer(gapMs: number) {
  let tail: Promise<unknown> = Promise.resolve()
  return function run<T>(task: () => Promise<T>): Promise<T> {
    const result = tail.then(task)
    tail = result.catch(() => {}).then(() => new Promise((r) => setTimeout(r, gapMs)))
    return result
  }
}
