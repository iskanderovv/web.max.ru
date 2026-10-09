import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useGreenApi } from './useGreenApi'

/** Turns on incoming messages and message-status (read) notifications for the instance. */
export function useEnableNotifications() {
  const api = useGreenApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.setSettings({ incomingWebhook: 'yes', outgoingWebhook: 'yes' }),
    onSuccess: () => {
      // The new values apply within a few minutes; show them as on right away.
      queryClient.setQueryData(['settings'], (old: object | undefined) => ({
        ...old,
        incomingWebhook: 'yes',
        outgoingWebhook: 'yes',
      }))
    },
  })
}
