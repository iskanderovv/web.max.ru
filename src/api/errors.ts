export class ApiError extends Error {
  status?: number
  body?: unknown

  constructor(message: string, status?: number, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export class NetworkError extends Error {
  constructor(message = 'Network error', options?: ErrorOptions) {
    super(message, options)
    this.name = 'NetworkError'
  }
}

export class ValidationError extends Error {
  issues?: unknown

  constructor(message: string, issues?: unknown) {
    super(message)
    this.name = 'ValidationError'
    this.issues = issues
  }
}

export const isAbortError = (e: unknown) => e instanceof DOMException && e.name === 'AbortError'

/** Monthly Developer-plan budget of one API method is used up (HTTP 466). */
export class QuotaError extends ApiError {
  method: string
  used: number
  total: number

  constructor(method: string, used: number, total: number, body?: unknown) {
    super(
      `Monthly limit of the free GREEN-API plan reached for “${method}” (${used}/${total}). It resets next month, or upgrade the plan.`,
      466,
      body,
    )
    this.name = 'QuotaError'
    this.method = method
    this.used = used
    this.total = total
  }
}
