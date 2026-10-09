import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useGreenApi } from '@/features/auth/hooks/useGreenApi'

export function useEnableNotifications() {
  const api = useGreenApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.setSettings({ incomingWebhook: 'yes', outgoingWebhook: 'yes' }),
    onSuccess: () => {
      queryClient.setQueryData(['settings'], (old: object | undefined) => ({
        ...old,
        incomingWebhook: 'yes',
        outgoingWebhook: 'yes',
      }))
    },
  })
}
