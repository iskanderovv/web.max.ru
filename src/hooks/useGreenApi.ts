import { useMemo } from 'react'
import { createGreenApi } from '@/api/green'
import { useAuth } from '@/store/auth'

/** API client bound to the logged-in credentials. Only call inside the authenticated shell. */
export function useGreenApi() {
  const credentials = useAuth((s) => s.credentials)
  return useMemo(() => {
    if (!credentials) throw new Error('Not authenticated')
    return createGreenApi(credentials)
  }, [credentials])
}
