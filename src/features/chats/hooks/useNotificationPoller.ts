import { useEffect, useState } from 'react'
import { applyNotification } from '@/features/chats/lib/incoming'
import { runPoller } from '@/features/chats/lib/poller'
import { useGreenApi } from '@/features/auth/hooks/useGreenApi'

export function useNotificationPoller() {
  const api = useGreenApi()
  const [online, setOnline] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    void runPoller(
      {
        receive: (t, signal) => api.receiveNotification(t, signal),
        remove: (id, signal) => api.deleteNotification(id, signal),
        handle: applyNotification,
        onStatus: setOnline,
      },
      controller.signal,
    )
    return () => controller.abort()
  }, [api])

  return online
}
