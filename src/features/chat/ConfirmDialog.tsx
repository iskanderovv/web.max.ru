import { Modal } from './Modal'

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="px-5 pb-4 text-[15px] text-tg-secondary">{message}</p>
      <div className="flex justify-end gap-2 px-5 pb-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-sm font-medium text-tg-blue hover:bg-tg-hover"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm()
            onClose()
          }}
          className="rounded-lg px-4 py-2 text-sm font-medium text-tg-danger hover:bg-red-50"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
