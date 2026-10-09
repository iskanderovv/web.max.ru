import { User } from 'lucide-react'
import { useState } from 'react'

const GRADIENTS = [
  ['#ff885e', '#ff516a'],
  ['#ffcd6a', '#ffa85c'],
  ['#82b1ff', '#665fff'],
  ['#a0de7e', '#54cb68'],
  ['#53edd6', '#28c9b7'],
  ['#72d5fd', '#2a9ef1'],
  ['#e0a2f3', '#d669ed'],
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
  size = 54,
}: {
  id: string
  title: string
  url?: string
  size?: number
}) {
  const [broken, setBroken] = useState(false)
  const [from, to] = GRADIENTS[hash(id) % GRADIENTS.length]
  const bare = title.replace(/^[@+]/, '')
  // A number or handle has no meaningful initial: show a person glyph instead.
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
        background: `linear-gradient(${from}, ${to})`,
      }}
    >
      {glyph ? <User size={size * 0.5} /> : initial}
    </span>
  )
}
