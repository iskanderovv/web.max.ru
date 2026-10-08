import { Send } from 'lucide-react'
import { useRef, useState } from 'react'
import { MAX_MESSAGE_LENGTH } from '@/api/green'
import { useSendMessage } from '@/hooks/useSendMessage'

export function MessageInput({ chatId }: { chatId: string }) {
  const { send } = useSendMessage()
  const [value, setValue] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  const tooLong = value.length > MAX_MESSAGE_LENGTH
  const canSend = value.trim().length > 0 && !tooLong

  function submit() {
    if (!canSend) return
    send(chatId, value)
    setValue('')
    if (ref.current) ref.current.style.height = 'auto'
  }

  return (
    <form
      className="mx-auto flex w-full max-w-3xl items-end gap-2 px-3 pb-3"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <div className="flex min-h-[54px] flex-1 items-end rounded-2xl bg-white px-4 py-3.5 shadow-sm">
        <textarea
          ref={ref}
          value={value}
          rows={1}
          placeholder="Message"
          aria-label="Message"
          onChange={(e) => {
            setValue(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              submit()
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
        aria-label="Send message"
        className="grid size-[54px] shrink-0 place-items-center rounded-full bg-tg-blue text-white shadow-sm transition hover:bg-tg-blue-dark disabled:bg-white disabled:text-tg-secondary"
      >
        <Send size={22} />
      </button>
    </form>
  )
}
