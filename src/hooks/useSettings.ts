import { useQuery } from '@tanstack/react-query'
import { useGreenApi } from './useGreenApi'

export function useSettings() {
  const api = useGreenApi()
  return useQuery({
    queryKey: ['settings'],
    queryFn: ({ signal }) => api.getSettings(signal),
    staleTime: Infinity,
  })
}
