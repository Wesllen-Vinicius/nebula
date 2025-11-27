interface RetryOptions {
  maxRetries?: number
  baseDelay?: number
  maxDelay?: number
  shouldRetry?: (error: unknown) => boolean
}

const defaultOptions: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  shouldRetry: (error: unknown) => {
    if (error instanceof Error) {
      // Não retry em erros de autenticação ou validação
      if (error.message.includes('401') || error.message.includes('400')) {
        return false
      }
    }
    return true
  },
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options }
  let lastError: unknown

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (attempt === opts.maxRetries || !opts.shouldRetry(error)) {
        throw error
      }

      // Exponential backoff com jitter
      const delay = Math.min(
        opts.baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        opts.maxDelay
      )

      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

export function createRetryableFetch(options: RetryOptions = {}) {
  return async function retryableFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    return withRetry(async () => {
      const response = await fetch(input, init)

      // Retry em erros de servidor (5xx) ou timeout
      if (response.status >= 500 || response.status === 408) {
        throw new Error(`HTTP ${response.status}`)
      }

      return response
    }, options)
  }
}

