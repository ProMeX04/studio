
/**
 * @fileOverview Service layer for safe AI operations with built-in error handling and API key rotation.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Custom error class for AI operations to provide clear, actionable error codes.
 */
export class AIError extends Error {
  constructor(
    message: string,
    public readonly code: 'API_KEY_REQUIRED' | 'ALL_KEYS_FAILED' | 'AI_INVALID_FORMAT' | 'AI_GENERATION_FAILED' | 'UNEXPECTED' | 'TIMEOUT',
  ) {
    super(message);
    this.name = 'AIError';
  }
}

interface PerformAIOperationParams<T> {
    apiKeys: string[];
    apiKeyIndex: number;
    operation: (genAI: GoogleGenerativeAI) => Promise<T>;
}

interface PerformAIOperationResult<T> {
    result: T;
    newApiKeyIndex: number;
}

/**
 * Performs a Google Generative AI operation with built-in API key rotation and error handling.
 * It iterates through available API keys in case of quota or invalid key errors.
 *
 * @template T The expected return type of the successful AI operation.
 * @param {PerformAIOperationParams<T>} params The parameters for the AI operation.
 * @returns {Promise<PerformAIOperationResult<T>>} A promise that resolves with the operation's result and the index of the working API key.
 * @throws {AIError} Throws a custom AIError if the operation fails across all keys or for other reasons.
 */
export async function performAIOperation<T>({
    apiKeys,
    apiKeyIndex,
    operation,
}: PerformAIOperationParams<T>): Promise<PerformAIOperationResult<T>> {
    if (!apiKeys || apiKeys.length === 0) {
        throw new AIError('API key is required.', 'API_KEY_REQUIRED');
    }

    let currentKeyIndex = apiKeyIndex;
    let invalidKeyCount = 0;
    let quotaErrorCount = 0;

    for (let i = 0; i < apiKeys.length; i++) {
        const apiKey = apiKeys[currentKeyIndex];
        
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const result = await operation(genAI);
            
            // Success, return result and the working key index
            return { result, newApiKeyIndex: currentKeyIndex };

        } catch (error: any) {
            const errorMessage = error.message || String(error) || '';
            const isQuotaError = errorMessage.includes('429');
            const isBadApiKeyError = errorMessage.includes('400');
            const isJsonError = errorMessage.includes('JSON');
            const isZodError = error.name === 'ZodError';

            console.warn(`API Key at index ${currentKeyIndex} failed. Reason: ${errorMessage}`);

            if (isQuotaError) quotaErrorCount++;
            if (isBadApiKeyError) invalidKeyCount++;
            
            if (isJsonError || isZodError) {
                 throw new AIError('AI đã trả về dữ liệu không hợp lệ. Vui lòng thử lại.', 'AI_INVALID_FORMAT');
            }

            // If it's a recoverable error (quota/bad key) and not the last key, try the next one.
            if ((isQuotaError || isBadApiKeyError) && i < apiKeys.length - 1) {
                currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
                console.log(`Trying next API Key at index ${currentKeyIndex}.`);
                continue; // Continue to the next iteration of the loop
            }

            // If it's an unrecoverable error or the last key has failed, throw.
            if (quotaErrorCount === apiKeys.length) {
                throw new AIError('Tất cả API key đều đã hết dung lượng. Vui lòng thử lại sau.', 'ALL_KEYS_FAILED');
            }
            if (invalidKeyCount === apiKeys.length) {
                throw new AIError('Tất cả API key đều không hợp lệ. Vui lòng kiểm tra lại.', 'ALL_KEYS_FAILED');
            }
            
            // For other unhandled errors.
            throw new AIError(errorMessage, 'UNEXPECTED');
        }
    }

    // This should theoretically not be reached, but as a fallback.
    throw new AIError('Tất cả các API key đều không thành công. Vui lòng kiểm tra lại.', 'ALL_KEYS_FAILED');
}
