/**
 * @fileOverview Utilities for safe AI operations with proper error handling
 */

export class AIOperationError extends Error {
  constructor(
    message: string, 
    public readonly code: 'API_KEY_REQUIRED' | 'ALL_KEYS_FAILED' | 'AI_INVALID_FORMAT' | 'AI_GENERATION_FAILED' | 'UNEXPECTED' | 'TIMEOUT',
    public readonly isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'AIOperationError';
  }
}
