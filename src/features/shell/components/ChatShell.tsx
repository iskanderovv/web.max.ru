import { useState } from 'react'
import { ChatWindow } from '@/features/chats/components/ChatWindow'
import { useAvatars } from '@/features/chats/hooks/useAvatars'
import { useChatNames } from '@/features/chats/hooks/useChatNames'
import { useDeliverySync } from '@/features/chats/hooks/useDeliverySync'
import { useNotificationPoller } from '@/features/chats/hooks/useNotificationPoller'
import { useChats } from '@/features/chats/store'
import { ContactsPanel } from '@/features/contacts/components/ContactsPanel'
import { NewContactDialog } from '@/features/contacts/components/NewContactDialog'
import { NotificationBanner } from '@/features/settings/components/NotificationBanner'
import { SettingsPanel } from '@/features/settings/components/SettingsPanel'
import type { Section } from '../sections'
import { ChatsPanel } from './ChatsPanel'
import { Rail } from './Rail'

export function ChatShell({ onLogout }: { onLogout: () => void }) {
  const [section, setSection] = useState<Section>('chats')
  const [adding, setAdding] = useState(false)
  const chatOpen = useChats((s) => s.activeChatId !== null)
  const online = useNotificationPoller()
  useAvatars()
  useChatNames()
  useDeliverySync()

  return (
    <div className="flex h-full flex-col bg-mx-surface">
      {!online && (
        <p
          role="status"
          className="bg-mx-warn-bg px-4 py-1.5 text-center text-sm text-mx-warn-text"
        >
          Connection problem. Retrying…
        </p>
      )}
      <NotificationBanner />
      <div className="flex min-h-0 flex-1 flex-col-reverse md:flex-row">
        <Rail section={section} onSelect={setSection} />
        <aside
          className={`min-h-0 w-full shrink-0 flex-1 flex-col border-mx-border bg-mx-surface md:flex md:w-[394px] md:flex-none md:border-r ${
            chatOpen ? 'hidden' : 'flex'
          }`}
        >
          {section === 'contacts' ? (
            <ContactsPanel onAdd={() => setAdding(true)} />
          ) : section === 'settings' ? (
            <SettingsPanel onLogout={onLogout} />
          ) : (
            <ChatsPanel filter={section} onNewChat={() => setAdding(true)} />
          )}
        </aside>
        <ChatWindow />
      </div>
      {adding && <NewContactDialog onClose={() => setAdding(false)} />}
    </div>
  )
}
