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

/** `998885880331@c.us` -> `+998885880331`. */
export function phoneFromWid(wid: unknown) {
  return typeof wid === 'string' && /^\d+/.test(wid) ? `+${wid.split('@')[0]}` : null
}
