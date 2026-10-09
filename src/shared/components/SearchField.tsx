import { Search } from 'lucide-react'

export function SearchField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="mx-4 mt-0.5 mb-2 flex h-9 shrink-0 items-center gap-2 rounded-xl bg-mx-hover px-3 focus-within:ring-2 focus-within:ring-mx-accent">
      <Search size={18} className="text-mx-secondary" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search"
        aria-label={label}
        className="w-full bg-transparent text-[15px] outline-none placeholder:text-mx-secondary"
      />
    </label>
  )
}
