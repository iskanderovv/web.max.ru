import { useEnableNotifications } from '../hooks/useEnableNotifications'
import { useSettings } from '../hooks/useSettings'

export function NotificationBanner() {
  const settings = useSettings()
  const enable = useEnableNotifications()

  const incomingOff = !!settings.data && settings.data.incomingWebhook !== 'yes'
  const statusOff = !!settings.data && !incomingOff && settings.data.outgoingWebhook !== 'yes'
  if (!incomingOff && !statusOff) return null

  return (
    <div
      role={incomingOff ? 'alert' : 'status'}
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-1.5 text-center text-sm ${
        incomingOff ? 'bg-mx-error-bg text-mx-error-text' : 'bg-mx-warn-bg text-mx-warn-text'
      }`}
    >
      <span>
        {incomingOff
          ? 'Incoming messages are disabled for this instance, so replies will not appear.'
          : 'Read receipts (✓✓) are off for this instance.'}
      </span>
      <button
        onClick={() => enable.mutate()}
        disabled={enable.isPending}
        className="rounded-md bg-mx-action px-3 py-0.5 font-medium text-white hover:bg-mx-action-dark disabled:opacity-60"
      >
        {enable.isPending ? 'Turning on…' : 'Turn on'}
      </button>
      {enable.isError && <span>Could not change settings: {enable.error.message}</span>}
      <span className="basis-full text-xs opacity-80">
        Applying restarts the instance and can take up to 5 minutes.
      </span>
    </div>
  )
}
