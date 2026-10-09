import { useEffect, useRef, useState } from 'react'

/** The element must stay on screen this long to count as "seen" (skips fast scrolling). */
export const IN_VIEW_DWELL_MS = 300

/** True once the element has stayed in view for a moment (always true without IntersectionObserver). */
export function useInView<T extends Element>() {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const el = ref.current
    if (seen || !el) return
    let dwell: ReturnType<typeof setTimeout> | undefined
    const io = new IntersectionObserver((entries) => {
      clearTimeout(dwell)
      if (entries.some((e) => e.isIntersecting)) {
        dwell = setTimeout(() => {
          setSeen(true)
          io.disconnect()
        }, IN_VIEW_DWELL_MS)
      }
    })
    io.observe(el)
    return () => {
      clearTimeout(dwell)
      io.disconnect()
    }
  }, [seen])

  return { ref, seen }
}
