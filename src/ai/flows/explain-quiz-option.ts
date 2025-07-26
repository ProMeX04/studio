
/**
 * @fileOverview Flow to explain a specific quiz answer option using Google Generative AI SDK.
 *
 * - explainQuizOption - A function that generates an explanation for a given quiz option.
 */

import { GoogleGenerativeAI, GenerationConfig, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { z } from 'zod';
import { ExplainQuizOptionInputSchema, ExplainQuizOptionOutput, ExplainQuizOptionOutputSchema, ExplainQuizOptionJsonSchema } from '@/ai/schemas';
import { AIOperationError } from '@/lib/ai-utils';

const ExplainQuizOptionClientInputSchema = ExplainQuizOptionInputSchema.extend({
    apiKeys: z.array(z.string()),
    apiKeyIndex: z.number(),
});
type ExplainQuizOptionClientInput = z.infer<typeof ExplainQuizOptionClientInputSchema>;

export async function explainQuizOption(
    input: ExplainQuizOptionClientInput
): Promise<{ result: ExplainQuizOptionOutput; newApiKeyIndex: number }> {
  const { apiKeys, apiKeyIndex, model: modelName, ...promptInput } = input;

  if (!apiKeys || apiKeys.length === 0) {
      throw new AIOperationError('API key is required.', 'API_KEY_REQUIRED');
  }

  let currentKeyIndex = apiKeyIndex;
  let invalidKeyCount = 0;
  let quotaErrorCount = 0;

  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[currentKeyIndex];
    
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const promptText = `You are a helpful quiz tutor.
      ${promptInput.selectedOption === promptInput.correctAnswer 
          ? `The user has chosen the CORRECT answer and wants a more detailed explanation.

      Topic: ${promptInput.topic}
      Question: "${promptInput.question}"
      Correct Answer: "${promptInput.correctAnswer}"

      Please provide a more in-depth explanation of why "${promptInput.selectedOption}" is the correct answer for the question "${promptInput.question}", in the language: ${promptInput.language}. You can provide additional context or interesting facts related to the topic. Populate the "explanation" field in the JSON output with this information.`
          : `The user has chosen an INCORRECT answer and wants to know why it's wrong.

      Topic: ${promptInput.topic}
      Question: "${promptInput.question}"
      Correct Answer: "${promptInput.correctAnswer}"
      The Incorrect Option to Explain: "${promptInput.selectedOption}"

      Please explain specifically why "${promptInput.selectedOption}" is not the correct answer for the question "${promptInput.question}", in the language: ${promptInput.language}. Populate the "explanation" field in the JSON output with this information.`
      }

      The "explanation" field must be valid standard Markdown:
      - Use backticks (\`) for inline code.
      - Use triple backticks (\`\`\`) for code blocks.
      - Use standard LaTeX syntax for math ($...$ or $$...$$).`;

        const generationConfig: GenerationConfig = {
          responseMimeType: "application/json",
          // @ts-ignore - responseSchema is a valid property
          responseSchema: ExplainQuizOptionJsonSchema,
        };

      
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: promptText }] }],
            generationConfig,
            safetySettings: [
              {
                  category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                  threshold: HarmBlockThreshold.BLOCK_NONE,
              },
              {
                  category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                  threshold: HarmBlockThreshold.BLOCK_NONE,
              },
              {
                  category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                  threshold: HarmBlockThreshold.BLOCK_NONE,
              },
              {
                  category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                  threshold: HarmBlockThreshold.BLOCK_NONE,
              },
            ]
        });
        
        const parsedJson = JSON.parse(result.response.text());
        const validatedOutput = ExplainQuizOptionOutputSchema.parse(parsedJson);

        // Success, return result and the working key index
        return { result: validatedOutput, newApiKeyIndex: currentKeyIndex };

    } catch (error: any) {
        const errorMessage = error.message || '';
        const isQuotaError = errorMessage.includes('429');
        const isBadApiKeyError = errorMessage.includes('400');

        console.warn(`API Key at index ${currentKeyIndex} failed. Reason: ${errorMessage}`);

        if (isQuotaError) quotaErrorCount++;
        if (isBadApiKeyError) invalidKeyCount++;

        if ((isQuotaError || isBadApiKeyError) && i < apiKeys.length - 1) {
            // Move to the next key if it's a known, recoverable error and not the last key
            currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
            console.log(`Trying next API Key at index ${currentKeyIndex}.`);
        } else {
            // For other errors or if all keys have been tried for quota
            console.error('❌ AI Explanation Error:', error);
             if (error.message.includes('JSON') || error instanceof z.ZodError) {
                throw new AIOperationError('AI đã trả về dữ liệu không hợp lệ. Vui lòng thử lại.', 'AI_INVALID_FORMAT');
            }
             if (invalidKeyCount === apiKeys.length) {
                throw new AIOperationError('Tất cả API key đều không hợp lệ. Vui lòng kiểm tra lại.', 'ALL_KEYS_FAILED');
            }
            if (quotaErrorCount === apiKeys.length) {
                throw new AIOperationError('Tất cả API key đều đã hết dung lượng. Vui lòng thử lại sau.', 'ALL_KEYS_FAILED');
            }
            throw new AIOperationError('Không thể tạo giải thích từ AI.', 'AI_GENERATION_FAILED');
        }
    }
  }

    if (invalidKeyCount === apiKeys.length) {
        throw new AIOperationError('Tất cả API key đều không hợp lệ. Vui lòng kiểm tra lại trong Cài đặt.', 'ALL_KEYS_FAILED');
    }
    if (quotaErrorCount === apiKeys.length) {
        throw new AIOperationError('Tất cả API key đều đã hết dung lượng. Vui lòng thử lại sau hoặc thêm key mới.', 'ALL_KEYS_FAILED');
    }
    throw new AIOperationError('Tất cả các API key đều không thành công. Vui lòng kiểm tra lại.', 'ALL_KEYS_FAILED');
}
