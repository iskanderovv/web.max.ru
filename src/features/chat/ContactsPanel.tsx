import { useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Contact } from '@/api/schemas'
import { useCachedPresence } from '@/hooks/useCachedPresence'
import { useGreenApi } from '@/hooks/useGreenApi'
import { isOnline } from '@/lib/presence'
import { useChats } from '@/store/chats'
import { Avatar } from './Avatar'
import { PanelHeader, SearchField } from './ChatsPanel'

const displayName = (c: Contact) => c.contactName || c.name || c.username || c.chatId

export function ContactsPanel({ onAdd }: { onAdd: () => void }) {
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
    ensureChat({ chatId: c.chatId, title: displayName(c), username: c.username })
    selectChat(c.chatId)
  }

  const noContacts = contacts.isSuccess && (contacts.data?.length ?? 0) === 0

  return (
    <section aria-label="Contacts" className="flex min-h-0 flex-1 flex-col">
      <PanelHeader title="Contacts" onAdd={onAdd} />
      <SearchField label="Search contacts" value={query} onChange={setQuery} />

      <div className="mx-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {contacts.isPending && (
          <p className="p-6 text-center text-sm text-mx-secondary">Loading…</p>
        )}
        {contacts.isError && (
          <p
            role="alert"
            className="m-3 rounded-xl bg-mx-error-bg px-3 py-2 text-sm text-mx-error-text"
          >
            {contacts.error.message}
          </p>
        )}
        {noContacts && (
          <div className="flex flex-col items-center gap-2 px-6 pt-16 text-center">
            <span className="grid size-20 place-items-center rounded-full bg-mx-hover text-mx-secondary">
              <Users size={36} />
            </span>
            <p className="mt-3 text-[17px] font-semibold">No contacts yet</p>
            <p className="text-sm text-mx-secondary">
              Add a contact and start chatting. The list can take up to 5 minutes to update.
            </p>
            <button
              onClick={onAdd}
              className="mt-3 rounded-xl bg-mx-accent px-6 py-2.5 text-[15px] font-medium text-white hover:bg-mx-accent-dark"
            >
              Add contact
            </button>
          </div>
        )}
        {contacts.isSuccess && !noContacts && list.length === 0 && (
          <p className="p-6 text-center text-sm text-mx-secondary">No contacts found</p>
        )}
        <ul>
          {list.map((c) => (
            <ContactRow key={c.chatId} contact={c} onOpen={() => open(c)} />
          ))}
        </ul>
      </div>
    </section>
  )
}

function ContactRow({ contact: c, onOpen }: { contact: Contact; onOpen: () => void }) {
  const presence = useCachedPresence(c.chatId)
  const fallback = [c.username, c.phoneNumber ? `+${c.phoneNumber}` : '']
    .filter(Boolean)
    .join(' · ')

  return (
    <li>
      <button
        onClick={onOpen}
        className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors hover:bg-mx-hover"
      >
        <Avatar id={c.chatId} title={displayName(c)} size={48} />
        <span className="min-w-0">
          <span className="block truncate text-[16px] font-medium">{displayName(c)}</span>
          <span
            className={`block truncate text-[14px] ${
              presence && isOnline(presence) ? 'text-mx-accent' : 'text-mx-secondary'
            }`}
          >
            {presence ?? (fallback || 'Telegram')}
          </span>
        </span>
      </button>
    </li>
  )
}
