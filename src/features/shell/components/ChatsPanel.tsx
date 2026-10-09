import { useState } from 'react'
import { ChatList } from '@/features/chats/components/ChatList'
import type { ChatFilter } from '@/features/chats/lib/chatFilters'
import { SearchResults } from '@/features/search/components/SearchResults'
import { PanelHeader } from '@/shared/components/PanelHeader'
import { SearchField } from '@/shared/components/SearchField'
import { SECTION_TITLE } from '../sections'

export function ChatsPanel({ filter, onNewChat }: { filter: ChatFilter; onNewChat: () => void }) {
  const [query, setQuery] = useState('')

  return (
    <>
      <PanelHeader title={SECTION_TITLE[filter]} onAdd={onNewChat} />
      <SearchField label="Search chats" value={query} onChange={setQuery} />
      {query.trim() ? (
        <SearchResults query={query} onDone={() => setQuery('')} />
      ) : (
        <ChatList filter={filter} />
      )}
    </>
  )
}
