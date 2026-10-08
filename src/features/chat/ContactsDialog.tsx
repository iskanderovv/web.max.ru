import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Contact } from '@/api/schemas'
import { useContactPresence } from '@/hooks/useContactPresence'
import { useGreenApi } from '@/hooks/useGreenApi'
import { useVisible } from '@/hooks/useVisible'
import { isOnline } from '@/lib/presence'
import { useChats } from '@/store/chats'
import { Avatar } from './Avatar'
import { Modal } from './Modal'

const displayName = (c: Contact) => c.contactName || c.name || c.username || c.chatId

export function ContactsDialog({ onClose }: { onClose: () => void }) {
  const api = useGreenApi()
  const [query, setQuery] = useState('')
  const contacts = useQuery({
    queryKey: ['contacts'],
    queryFn: ({ signal }) => api.getContacts(signal),
    staleTime: 5 * 60_000,
  })

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (contacts.data ?? [])
      .filter((c) => (c.type ?? 'user') === 'user')
      .filter(
        (c) =>
          !q ||
          [displayName(c), c.username, c.phoneNumber ? String(c.phoneNumber) : '']
            .join(' ')
            .toLowerCase()
            .includes(q),
      )
      .sort((a, b) => displayName(a).localeCompare(displayName(b)))
  }, [contacts.data, query])

  function open(c: Contact) {
    const { ensureChat, selectChat } = useChats.getState()
    ensureChat({ chatId: c.chatId, title: c.username || displayName(c), username: c.username })
    selectChat(c.chatId)
    onClose()
  }

  return (
    <Modal title="Contacts" onClose={onClose} wide>
      <label className="mx-5 mb-2 flex items-center gap-2 rounded-full bg-tg-hover px-3 py-2 focus-within:ring-2 focus-within:ring-tg-blue">
        <Search size={18} className="text-tg-secondary" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search contacts"
          aria-label="Search contacts"
          className="w-full bg-transparent text-[15px] outline-none placeholder:text-tg-secondary"
        />
      </label>

      <div className="tg-scroll min-h-40 flex-1 overflow-y-auto px-2 pb-3">
        {contacts.isPending && (
          <p className="p-6 text-center text-sm text-tg-secondary">Loading…</p>
        )}
        {contacts.isError && (
          <p role="alert" className="m-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {contacts.error.message}
          </p>
        )}
        {contacts.isSuccess && list.length === 0 && (
          <p className="p-6 text-center text-sm text-tg-secondary">
            {query
              ? 'No contacts found'
              : 'No contacts yet. The list can take up to 5 minutes to update.'}
          </p>
        )}
        <ul>
          {list.map((c) => (
            <ContactRow key={c.chatId} contact={c} onOpen={() => open(c)} />
          ))}
        </ul>
      </div>
    </Modal>
  )
}

function ContactRow({ contact: c, onOpen }: { contact: Contact; onOpen: () => void }) {
  const { ref, visible } = useVisible<HTMLLIElement>()
  const { text, failed } = useContactPresence(c.chatId, visible)

  return (
    <li ref={ref}>
      <button
        onClick={onOpen}
        className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-tg-hover"
      >
        <Avatar id={c.chatId} title={displayName(c)} size={44} />
        <span className="min-w-0">
          <span className="block truncate font-medium">{displayName(c)}</span>
          <span
            className={`block truncate text-sm ${text && isOnline(text) ? 'text-tg-blue' : 'text-tg-secondary'}`}
          >
            {text ?? (failed ? 'last seen recently' : '…')}
          </span>
        </span>
      </button>
    </li>
  )
}
