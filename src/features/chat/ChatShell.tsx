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
    <div className="flex h-full flex-col bg-white">
      {!online && (
        <p role="status" className="bg-amber-100 px-4 py-1.5 text-center text-sm text-amber-900">
          Connection problem. Retrying…
        </p>
      )}
      {incomingDisabled && (
        <p role="alert" className="bg-red-100 px-4 py-1.5 text-center text-sm text-red-900">
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
