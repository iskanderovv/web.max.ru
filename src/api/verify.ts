import { createGreenApi } from './green'
import { ApiError } from './errors'
import type { Credentials } from './schemas'

export interface VerifyResult {
  /** `incomingWebhook` is off: replies would never reach the queue. */
  incomingDisabled: boolean
}

/** Checks the credentials against the live instance. Throws a user-readable error. */
export async function verifyCredentials(
  c: Credentials,
  signal?: AbortSignal,
): Promise<VerifyResult> {
  const api = createGreenApi(c)
  const { stateInstance } = await api.getStateInstance(signal)
  if (stateInstance !== 'authorized') {
    throw new ApiError(
      `Instance is not authorized (state: ${stateInstance}). Link your account in the GREEN-API console.`,
    )
  }
  const settings = await api.getSettings(signal)
  return { incomingDisabled: settings.incomingWebhook !== 'yes' }
}
