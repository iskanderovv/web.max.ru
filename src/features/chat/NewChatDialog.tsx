import { useMutation } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useState } from 'react'
import { useGreenApi } from '@/hooks/useGreenApi'
import { parseRecipient } from '@/lib/recipient'
import { useChats } from '@/store/chats'

export function NewChatDialog({ onClose }: { onClose: () => void }) {
  const api = useGreenApi()
  const [value, setValue] = useState('')
  const [formatError, setFormatError] = useState<string | null>(null)

  const lookup = useMutation({
    mutationFn: async (input: string) => {
      const recipient = parseRecipient(input)
      if (!recipient) throw new Error('Enter a phone number (e.g. 998901234567) or @username')
      const res = await api.checkAccount(recipient)
      if (!res.exist || !res.chatId) {
        throw new Error(
          'No Telegram account found. The number may be hidden by privacy settings, try @username.',
        )
      }
      return { res, recipient }
    },
    onSuccess: ({ res, recipient }) => {
      const username = res.username || ('username' in recipient ? recipient.username : undefined)
      const title =
        username ?? ('phoneNumber' in recipient ? `+${recipient.phoneNumber}` : res.chatId)
      useChats.getState().ensureChat({ chatId: res.chatId, title, username })
      useChats.getState().selectChat(res.chatId)
      onClose()
    },
  })

  const error = formatError ?? lookup.error?.message

  return (
    <div
      className="fixed inset-0 z-10 grid place-items-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="New chat"
    >
      <form
        className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-5 shadow-xl"
        onSubmit={(e) => {
          e.preventDefault()
          setFormatError(null)
          if (!parseRecipient(value)) {
            setFormatError('Enter a phone number (e.g. 998901234567) or @username')
            return
          }
          lookup.mutate(value)
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">New chat</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-500 hover:text-slate-800"
          >
            <X size={18} />
          </button>
        </div>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-600">Phone number or @username</span>
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="998901234567 or @username"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
          />
        </label>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={lookup.isPending}
          className="w-full rounded-lg bg-sky-500 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-60"
        >
          {lookup.isPending ? 'Checking…' : 'Start chat'}
        </button>
      </form>
    </div>
  )
}
