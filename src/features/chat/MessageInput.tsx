import { Check, Pencil, Send, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { MAX_MESSAGE_LENGTH } from '@/api/green'
import { useMessageActions } from '@/hooks/useMessageActions'
import { useSendMessage } from '@/hooks/useSendMessage'
import { useTyping } from '@/hooks/useTyping'
import type { ChatMessage } from '@/store/chats'

export function MessageInput({
  chatId,
  editing,
  onEditDone,
}: {
  chatId: string
  editing: ChatMessage | null
  onEditDone: () => void
}) {
  const { send } = useSendMessage()
  const { edit } = useMessageActions(chatId)
  const notifyTyping = useTyping(chatId)
  const [value, setValue] = useState(editing?.text ?? '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLTextAreaElement>(null)

  // Mounted fresh per edit target (see `key` in ChatWindow): focus and fit the prefilled text.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (editing) el.focus()
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tooLong = value.length > MAX_MESSAGE_LENGTH
  const canSend = value.trim().length > 0 && !tooLong && !pending

  function resize(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  function reset() {
    setValue('')
    setError(null)
    if (ref.current) ref.current.style.height = 'auto'
  }

  function cancelEdit() {
    reset()
    onEditDone()
  }

  async function submit() {
    if (!canSend) return
    if (!editing) {
      send(chatId, value)
      reset()
      return
    }
    setPending(true)
    setError(null)
    try {
      await edit(editing, value)
      reset()
      onEditDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not edit the message')
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      className="mx-auto w-full max-w-3xl px-3 pb-3"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      {editing && (
        <div className="mb-1 flex items-center gap-3 rounded-t-2xl bg-tg-surface px-4 py-2 shadow-sm">
          <Pencil size={18} className="shrink-0 text-tg-blue" />
          <div className="min-w-0 flex-1 border-l-2 border-tg-blue pl-2 text-sm">
            <p className="font-medium text-tg-blue">Edit message</p>
            <p className="truncate text-tg-secondary">{editing.text}</p>
          </div>
          <button
            type="button"
            onClick={cancelEdit}
            aria-label="Cancel editing"
            className="rounded-full p-1.5 text-tg-secondary hover:bg-tg-hover"
          >
            <X size={18} />
          </button>
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="mb-1 rounded-lg bg-tg-error-bg px-3 py-1.5 text-sm text-tg-error-text"
        >
          {error}
        </p>
      )}
      <div className="flex items-end gap-2">
        <div className="flex min-h-[54px] flex-1 items-center rounded-2xl bg-tg-surface px-4 py-3 shadow-sm">
          <textarea
            ref={ref}
            value={value}
            rows={1}
            placeholder="Message"
            aria-label="Message"
            onChange={(e) => {
              setValue(e.target.value)
              resize(e.target)
              if (!editing && e.target.value.trim()) notifyTyping()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                void submit()
              } else if (e.key === 'Escape' && editing) {
                cancelEdit()
              }
            }}
            className="max-h-40 w-full resize-none bg-transparent text-[15px] leading-snug outline-none placeholder:text-tg-secondary"
          />
          {value.length > MAX_MESSAGE_LENGTH - 200 && (
            <span
              className={`ml-2 self-center text-xs ${tooLong ? 'text-tg-danger' : 'text-tg-secondary'}`}
            >
              {MAX_MESSAGE_LENGTH - value.length}
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={!canSend}
          aria-label={editing ? 'Save changes' : 'Send message'}
          className="grid size-[54px] shrink-0 place-items-center rounded-full bg-tg-blue text-white shadow-sm transition hover:bg-tg-blue-dark disabled:bg-tg-surface disabled:text-tg-secondary"
        >
          {editing ? <Check size={24} /> : <Send size={22} />}
        </button>
      </div>
    </form>
  )
}
