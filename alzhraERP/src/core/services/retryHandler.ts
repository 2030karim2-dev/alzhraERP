/**
 * Retry Handler — Centralized retry logic with exponential backoff.
 * 
 * Provides a reusable retry mechanism for API calls, DB operations,
 * and other async functions that may fail transiently.
 * 
 * @module core/services/retryHandler
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in milliseconds between retries (default: 1000) */
  baseDelay?: number;
  /** Maximum delay cap in milliseconds (default: 10000) */
  maxDelay?: number;
  /** Whether to use exponential backoff (default: true) */
  exponential?: boolean;
  /** Called before each retry with the error and attempt number */
  onRetry?: (error: Error, attempt: number) => void;
  /** If true, only retries on network/transient errors (default: true) */
  retryOnlyTransient?: boolean;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  exponential: true,
  retryOnlyTransient: true,
};

/**
 * Checks if an error is transient (network error, timeout, 5xx, etc.)
 * Errors that should NOT be retried: 4xx client errors, validation errors
 */
export const isTransientError = (error: Error): boolean => {
  // Network errors (fetch failed, connection refused)
  if (
    error.message?.includes('Failed to fetch') ||
    error.message?.includes('NetworkError') ||
    error.message?.includes('ERR_NETWORK') ||
    error.message?.includes('ECONNREFUSED') ||
    error.message?.includes('ETIMEDOUT') ||
    error.message?.includes('AbortError') ||
    error.message?.includes('timeout')
  ) {
    return true;
  }

  // Check for HTTP 5xx status codes embedded in error
  if (
    error.message?.includes('500') ||
    error.message?.includes('502') ||
    error.message?.includes('503') ||
    error.message?.includes('504')
  ) {
    return true;
  }

  // Rate limiting
  if (error.message?.includes('429') || error.message?.includes('rate limit')) {
    return true;
  }

  // Don't retry 4xx client errors
  return false;
};

/**
 * Calculate delay for a given retry attempt using exponential backoff.
 */
const calculateDelay = (
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  exponential: boolean,
): number => {
  if (exponential) {
    // Exponential: baseDelay * 2^(attempt-1) with jitter
    const expDelay = baseDelay * Math.pow(2, attempt - 1);
    // Add ±25% jitter to prevent thundering herd
    const jitter = expDelay * (0.5 + Math.random() * 0.5);
    return Math.min(jitter, maxDelay);
  }
  // Linear: baseDelay * attempt
  return Math.min(baseDelay * attempt, maxDelay);
};

/**
 * Retry an async function with exponential backoff.
 * 
 * @example
 * ```typescript
 * const data = await retryWithBackoff(
 *   () => fetch('/api/products').then(r => r.json()),
 *   { maxRetries: 3, baseDelay: 1000 }
 * );
 * ```
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> => {
  const {
    maxRetries,
    baseDelay,
    maxDelay,
    exponential,
    retryOnlyTransient,
    onRetry,
  } = { ...DEFAULT_OPTIONS, ...options };

  let lastError: Error = new Error('Unknown retry error');

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Skip retry for non-transient errors if configured
      if (retryOnlyTransient && !isTransientError(lastError)) {
        break;
      }

      // Notify callback
      onRetry?.(lastError, attempt + 1);

      // Wait before retrying
      const delay = calculateDelay(attempt + 1, baseDelay, maxDelay, exponential);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

/**
 * Wraps a function with retry logic, returning a new function with the same signature.
 * Useful for creating retry-enabled versions of existing functions.
 * 
 * @example
 * ```typescript
 * const safeFetch = withRetry(fetchProducts, { maxRetries: 2 });
 * const products = await safeFetch();
 * ```
 */
export const withRetry = <TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: RetryOptions = {},
): ((...args: TArgs) => Promise<TResult>) => {
  return async (...args: TArgs): Promise<TResult> => {
    return retryWithBackoff(() => fn(...args), options);
  };
};

/**
 * Pre-configured retry presets for common scenarios.
 */
export const retryPresets = {
  /** Fast retry for UI operations (2 retries, 500ms base) */
  ui: { maxRetries: 2, baseDelay: 500, maxDelay: 3000 } as const,

  /** Standard retry for API calls (3 retries, 1s base) */
  api: { maxRetries: 3, baseDelay: 1000, maxDelay: 10000 } as const,

  /** Slow retry for heavy operations like file uploads (3 retries, 2s base) */
  heavy: { maxRetries: 3, baseDelay: 2000, maxDelay: 30000 } as const,

  /** Aggressive retry for critical operations (5 retries, 1s base) */
  critical: { maxRetries: 5, baseDelay: 1000, maxDelay: 15000 } as const,
} as const;
