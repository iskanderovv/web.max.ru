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
