import { useEffect, useRef, useState } from 'react'

/** Row must stay on screen this long before it counts as "seen" (skips fast scrolling). */
export const VISIBLE_DWELL_MS = 300

/** True once the element has stayed in view for a moment (always true without IntersectionObserver). */
export function useVisible<T extends Element>() {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const el = ref.current
    if (visible || !el) return
    let dwell: ReturnType<typeof setTimeout> | undefined
    const io = new IntersectionObserver((entries) => {
      const inView = entries.some((e) => e.isIntersecting)
      clearTimeout(dwell)
      if (inView) {
        dwell = setTimeout(() => {
          setVisible(true)
          io.disconnect()
        }, VISIBLE_DWELL_MS)
      }
    })
    io.observe(el)
    return () => {
      clearTimeout(dwell)
      io.disconnect()
    }
  }, [visible])

  return { ref, visible }
}
