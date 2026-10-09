import { Check, Pencil, Send, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { MAX_MESSAGE_LENGTH } from '@/api/green'
import { useMessageActions } from '@/features/chats/hooks/useMessageActions'
import { useSendMessage } from '@/features/chats/hooks/useSendMessage'
import { useTyping } from '@/features/chats/hooks/useTyping'
import type { ChatMessage } from '@/features/chats/store'

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
  const startedEditing = useRef(!!editing)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (startedEditing.current) el.focus()
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
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
      className="mx-auto w-full max-w-[732px] px-4 pb-4"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      {editing && (
        <div className="mb-2 flex items-center gap-3 rounded-2xl bg-mx-input px-4 py-2 shadow-lg ring-1 ring-mx-ring">
          <Pencil size={18} className="shrink-0 text-mx-accent" />
          <div className="min-w-0 flex-1 border-l-2 border-mx-accent pl-2 text-sm">
            <p className="font-medium text-mx-accent">Edit message</p>
            <p className="truncate text-mx-secondary">{editing.text}</p>
          </div>
          <button
            type="button"
            onClick={cancelEdit}
            aria-label="Cancel editing"
            className="rounded-full p-1.5 text-mx-secondary hover:bg-mx-hover"
          >
            <X size={18} />
          </button>
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="mb-1 rounded-lg bg-mx-error-bg px-3 py-1.5 text-sm text-mx-error-text"
        >
          {error}
        </p>
      )}
      <div className="flex items-end gap-1 rounded-[22px] bg-mx-input p-1.5 pl-4 shadow-lg ring-1 ring-mx-ring">
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
          className="max-h-40 min-h-10 flex-1 resize-none bg-transparent py-2 text-[16px] leading-6 outline-none placeholder:text-mx-secondary"
        />
        {value.length > MAX_MESSAGE_LENGTH - 200 && (
          <span className={`mb-2.5 text-xs ${tooLong ? 'text-mx-danger' : 'text-mx-secondary'}`}>
            {MAX_MESSAGE_LENGTH - value.length}
          </span>
        )}
        <button
          type="submit"
          disabled={!canSend}
          aria-label={editing ? 'Save changes' : 'Send message'}
          className={`grid size-10 shrink-0 place-items-center rounded-full transition ${
            canSend ? 'bg-mx-accent text-white hover:bg-mx-accent-dark' : 'text-mx-secondary'
          }`}
        >
          {editing ? <Check size={22} /> : <Send size={20} />}
        </button>
      </div>
    </form>
  )
}
