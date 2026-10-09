import { Plus } from 'lucide-react'

export function PanelHeader({ title, onAdd }: { title: string; onAdd?: () => void }) {
  return (
    <header className="mt-1.5 flex h-14 shrink-0 items-center justify-between px-4">
      <h1 className="text-[24px] leading-7 font-semibold">{title}</h1>
      {onAdd && (
        <button
          onClick={onAdd}
          aria-label="New chat"
          className="grid size-8 place-items-center rounded-full bg-mx-accent text-white transition-colors hover:bg-mx-accent-dark"
        >
          <Plus size={18} strokeWidth={2.6} />
        </button>
      )}
    </header>
  )
}
