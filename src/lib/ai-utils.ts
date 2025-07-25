/**
 * @fileOverview Utilities for safe AI operations with proper error handling
 */

export interface AICallOptions {
  retries?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export class AIOperationError extends Error {
  constructor(
    message: string, 
    public readonly code: string,
    public readonly isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'AIOperationError';
  }
}

/**
 * Safely execute an AI function with timeout, retry, and abort support
 */
export async function safeAICall<T>(
  aiFunction: () => Promise<T>,
  options: AICallOptions = {}
): Promise<T> {
  const { 
    retries = 3, 
    timeoutMs = 30000, 
    signal 
  } = options;

  for (let attempt = 0; attempt < retries; attempt++) {
    if (signal?.aborted) {
      throw new AIOperationError("Operation was aborted", "ABORTED");
    }

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new AIOperationError("AI operation timed out", "TIMEOUT", true));
        }, timeoutMs);
        
        signal?.addEventListener('abort', () => {
          clearTimeout(timeoutId);
          reject(new AIOperationError("Operation was aborted", "ABORTED"));
        });
      });

      const result = await Promise.race([
        aiFunction(),
        timeoutPromise
      ]);

      return result;
    } catch (error: any) {
      const isLastAttempt = attempt === retries - 1;
      
      if (error instanceof AIOperationError) {
        if (!error.isRetryable || isLastAttempt) {
          throw error;
        }
      } else {
        console.warn(`🔄 AI call attempt ${attempt + 1} failed:`, error.message);
        
        if (isLastAttempt) {
          throw new AIOperationError(
            `AI operation failed after ${retries} attempts: ${error.message}`,
            "MAX_RETRIES_EXCEEDED"
          );
        }
      }

      // Exponential backoff with jitter
      const baseDelay = Math.min(1000 * Math.pow(2, attempt), 5000);
      const jitter = Math.random() * 1000;
      const delay = baseDelay + jitter;
      
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new AIOperationError("Unexpected error in safeAICall", "UNEXPECTED");
}

/**
 * Batch processing with proper cleanup
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T, signal: AbortSignal) => Promise<R>,
  options: {
    batchSize?: number;
    delayBetweenBatches?: number;
    signal?: AbortSignal;
  } = {}
): Promise<R[]> {
  const {
    batchSize = 5,
    delayBetweenBatches = 1000,
    signal
  } = options;

  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    if (signal?.aborted) {
      throw new AIOperationError("Batch processing was aborted", "ABORTED");
    }

    const batch = items.slice(i, i + batchSize);
    const batchPromises = batch.map(item => 
      processor(item, signal || new AbortController().signal)
    );

    try {
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches (except for the last batch)
      if (i + batchSize < items.length && delayBetweenBatches > 0) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    } catch (error) {
      console.error(`❌ Batch processing failed at batch starting index ${i}:`, error);
      throw error;
    }
  }

  return results;
}
