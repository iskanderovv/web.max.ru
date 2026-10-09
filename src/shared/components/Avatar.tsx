import { User } from 'lucide-react'
import { useState } from 'react'

const GRADIENTS = [
  ['#ff48b6', '#ff8a35'],
  ['#14e1d5', '#03c722'],
  ['#ffc93d', '#ff832a'],
  ['#08d7f3', '#5398ff'],
  ['#bf97ff', '#526eff'],
]

function hash(s: string) {
  let h = 0
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

export function Avatar({
  id,
  title,
  url,
  size = 64,
}: {
  id: string
  title: string
  url?: string
  size?: number
}) {
  const [broken, setBroken] = useState(false)
  const [from, to] = GRADIENTS[hash(id) % GRADIENTS.length]
  const bare = title.replace(/^[@+]/, '')
  const glyph = !bare || /^\d/.test(bare)
  const initial = bare.charAt(0).toUpperCase()

  if (url && !broken) {
    return (
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-full font-medium text-white select-none"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `linear-gradient(135deg, ${from}, ${to})`,
      }}
    >
      {glyph ? <User size={size * 0.5} /> : initial}
    </span>
  )
}
