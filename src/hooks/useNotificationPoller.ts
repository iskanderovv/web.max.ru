import { useEffect, useState } from 'react'
import { applyNotification } from '@/lib/incoming'
import { runPoller } from '@/lib/poller'
import { useGreenApi } from './useGreenApi'

/** Runs the receive/delete loop while mounted. Returns `false` while the connection is failing. */
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
