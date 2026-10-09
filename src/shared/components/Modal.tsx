import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="mx-backdrop fixed inset-0 z-30 grid place-items-center bg-black/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`mx-pop flex max-h-[85vh] w-full flex-col rounded-[20px] bg-mx-card text-mx-text shadow-2xl ${wide ? 'max-w-md' : 'max-w-sm'}`}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-mx-secondary hover:bg-mx-hover"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
