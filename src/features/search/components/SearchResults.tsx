import { typeLabel } from '@/shared/lib/chatType'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useMemo } from 'react'
import { useGreenApi } from '@/features/auth/hooks/useGreenApi'
import { realNameOf } from '@/shared/lib/names'
import {
  buildGlobalHits,
  filterAppChats,
  usernameQuery,
  type SearchHit,
} from '@/features/search/lib/search'
import { selectSortedChats, useChats, type Chat } from '@/features/chats/store'
import { Avatar } from '@/shared/components/Avatar'

const FIVE_MIN = 5 * 60_000

function open(hit: SearchHit, done: () => void) {
  const { ensureChat, selectChat } = useChats.getState()
  ensureChat({ chatId: hit.chatId, title: hit.title, username: hit.username, type: hit.type })
  selectChat(hit.chatId)
  done()
}

export function SearchResults({ query, onDone }: { query: string; onDone: () => void }) {
  const api = useGreenApi()
  const chatMap = useChats((s) => s.chats)
  const active = query.trim().length > 0

  const chats = useQuery({
    queryKey: ['chats'],
    queryFn: ({ signal }) => api.getChats(signal),
    staleTime: FIVE_MIN,
    enabled: active,
  })
  const contacts = useQuery({
    queryKey: ['contacts'],
    queryFn: ({ signal }) => api.getContacts(signal),
    staleTime: FIVE_MIN,
    enabled: active,
  })

  const inApp = useMemo(
    () => filterAppChats(selectSortedChats({ chats: chatMap }), query),
    [chatMap, query],
  )
  const global = useMemo(
    () =>
      buildGlobalHits(query, chats.data ?? [], contacts.data ?? [], new Set(Object.keys(chatMap))),
    [query, chats.data, contacts.data, chatMap],
  )

  const handle = usernameQuery(query)
  const handleKnown =
    !!handle &&
    [...inApp.map((c) => c.username), ...global.map((h) => h.username)].some(
      (u) => u?.toLowerCase() === handle.toLowerCase(),
    )

  const lookup = useMutation({
    mutationFn: async (username: string) => {
      const res = await api.checkAccount({ username })
      if (!res.exist || !res.chatId) {
        throw new Error('No Telegram user or bot with this username.')
      }
      const name = realNameOf(await api.getContactInfo(res.chatId).catch(() => undefined))
      return { res, username, name }
    },
    onSuccess: ({ res, username, name }) =>
      open(
        {
          chatId: res.chatId,
          title: name || res.username || username,
          username: res.username || username,
          type: 'user',
        },
        onDone,
      ),
  })

  const loading = chats.isPending || contacts.isPending
  const empty = inApp.length === 0 && global.length === 0

  return (
    <div
      className="mx-scroll flex-1 overflow-y-auto px-2"
      aria-label="Search results"
      role="region"
    >
      {inApp.length > 0 && (
        <Section title="Chats">
          {inApp.map((c) => (
            <Row key={c.chatId} chat={c} onClick={() => open(toHit(c), onDone)} />
          ))}
        </Section>
      )}

      {global.length > 0 && (
        <Section title="Global search">
          {global.map((h) => (
            <HitRow key={h.chatId} hit={h} onClick={() => open(h, onDone)} />
          ))}
        </Section>
      )}

      {handle && !handleKnown && (
        <Section title="Find on Telegram">
          <li>
            <button
              onClick={() => lookup.mutate(handle)}
              disabled={lookup.isPending}
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-mx-hover disabled:opacity-60"
            >
              <span className="grid size-[54px] shrink-0 place-items-center rounded-full bg-mx-accent text-white">
                <Search size={22} />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  {lookup.isPending ? 'Searching…' : `Search ${handle}`}
                </span>
                <span className="block text-sm text-mx-secondary">Users and bots by username</span>
              </span>
            </button>
            {lookup.error && (
              <p
                role="alert"
                className="mx-2 mb-2 rounded-lg bg-mx-error-bg px-3 py-2 text-sm text-mx-error-text"
              >
                {lookup.error.message}
              </p>
            )}
          </li>
        </Section>
      )}

      {loading && empty && <p className="p-6 text-center text-sm text-mx-secondary">Searching…</p>}
      {!loading && empty && !handle && (
        <p className="p-6 text-center text-sm text-mx-secondary">No results for “{query.trim()}”</p>
      )}
      {(chats.isError || contacts.isError) && (
        <p
          role="alert"
          className="m-2 rounded-lg bg-mx-error-bg px-3 py-2 text-sm text-mx-error-text"
        >
          Could not load your Telegram chats. {(chats.error ?? contacts.error)?.message}
        </p>
      )}
      <p className="px-3 py-3 text-xs text-mx-secondary">
        Search covers your chats, contacts, groups, channels and bots. Type an exact @username to
        find any user or bot.
      </p>
    </div>
  )
}

const toHit = (c: Chat): SearchHit => ({
  chatId: c.chatId,
  title: c.title,
  username: c.username,
  type: c.type ?? 'user',
})

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-2">
      <h3 className="px-3 py-2 text-sm font-medium text-mx-accent">{title}</h3>
      <ul>{children}</ul>
    </section>
  )
}

function Row({ chat, onClick }: { chat: Chat; onClick: () => void }) {
  return (
    <li>
      <button
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-mx-hover"
      >
        <Avatar id={chat.chatId} title={chat.title} url={chat.avatarUrl} />
        <Names title={chat.title} sub={[chat.username, typeLabel(chat.type)]} />
      </button>
    </li>
  )
}

function HitRow({ hit, onClick }: { hit: SearchHit; onClick: () => void }) {
  return (
    <li>
      <button
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-mx-hover"
      >
        <Avatar id={hit.chatId} title={hit.title} />
        <Names
          title={hit.title}
          sub={[hit.username, hit.phone ? `+${hit.phone}` : '', typeLabel(hit.type)]}
        />
      </button>
    </li>
  )
}

function Names({ title, sub }: { title: string; sub: (string | undefined)[] }) {
  return (
    <span className="min-w-0">
      <span className="block truncate font-medium">{title}</span>
      <span className="block truncate text-sm text-mx-secondary">
        {sub.filter(Boolean).join(' · ') || 'Telegram'}
      </span>
    </span>
  )
}
