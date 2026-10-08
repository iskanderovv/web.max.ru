import { useAvatars } from '@/hooks/useAvatars'
import { useChatNames } from '@/hooks/useChatNames'
import { useNotificationPoller } from '@/hooks/useNotificationPoller'
import { useSettings } from '@/hooks/useSettings'
import { ChatWindow } from './ChatWindow'
import { Sidebar } from './Sidebar'

export function ChatShell() {
  const online = useNotificationPoller()
  const settings = useSettings()
  useAvatars()
  useChatNames()
  const incomingDisabled = settings.data && settings.data.incomingWebhook !== 'yes'

  return (
    <div className="flex h-full flex-col bg-tg-surface">
      {!online && (
        <p
          role="status"
          className="bg-tg-warn-bg px-4 py-1.5 text-center text-sm text-tg-warn-text"
        >
          Connection problem. Retrying…
        </p>
      )}
      {incomingDisabled && (
        <p
          role="alert"
          className="bg-tg-error-bg px-4 py-1.5 text-center text-sm text-tg-error-text"
        >
          Incoming messages are disabled for this instance. Set <code>incomingWebhook</code> to{' '}
          <code>yes</code> in the GREEN-API console.
        </p>
      )}
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <ChatWindow />
      </div>
    </div>
  )
}
