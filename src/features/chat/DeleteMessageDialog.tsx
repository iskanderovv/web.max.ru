import { useState } from 'react'
import { canDeleteRemotely } from '@/lib/messageRules'
import { useMessageActions } from '@/hooks/useMessageActions'
import type { ChatMessage } from '@/store/chats'
import { Modal } from './Modal'

export function DeleteMessageDialog({
  chatId,
  chatTitle,
  message,
  onClose,
}: {
  chatId: string
  chatTitle: string
  message: ChatMessage
  onClose: () => void
}) {
  const { remove } = useMessageActions(chatId)
  const remote = canDeleteRemotely(message)
  const [forEveryone, setForEveryone] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setPending(true)
    setError(null)
    try {
      await remove(message, forEveryone)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete the message')
      setPending(false)
    }
  }

  return (
    <Modal title="Delete message" onClose={onClose}>
      <div className="space-y-3 px-5 pb-2">
        <p className="text-[15px] text-tg-secondary">
          {remote
            ? 'Do you want to delete this message?'
            : 'This message will be removed from this app only.'}
        </p>
        {remote && (
          <label className="flex items-center gap-2 text-[15px]">
            <input
              type="checkbox"
              checked={forEveryone}
              onChange={(e) => setForEveryone(e.target.checked)}
              className="size-4 accent-tg-blue"
            />
            Also delete for {chatTitle}
          </label>
        )}
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
      <div className="flex justify-end gap-2 px-5 pt-1 pb-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-sm font-medium text-tg-blue hover:bg-tg-hover"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={pending}
          className="rounded-lg px-4 py-2 text-sm font-medium text-tg-danger hover:bg-red-50 disabled:opacity-60"
        >
          {pending ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </Modal>
  )
}
