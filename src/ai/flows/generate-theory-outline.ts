
/**
 * @fileOverview Flow to generate a structured outline for a theory document.
 */

import { GoogleGenerativeAI, GenerationConfig, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { z } from 'zod';
import { GenerateTheoryOutlineInputSchema, GenerateTheoryOutlineOutputSchema, GenerateTheoryOutlineOutput } from '@/ai/schemas';
import { AIOperationError } from '@/lib/ai-utils';

const ClientInputSchema = GenerateTheoryOutlineInputSchema.extend({
    apiKeys: z.array(z.string()),
    apiKeyIndex: z.number(),
});
type ClientInput = z.infer<typeof ClientInputSchema>;

export async function generateTheoryOutline(
  input: ClientInput
): Promise<{ result: GenerateTheoryOutlineOutput; newApiKeyIndex: number }> {
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

      const promptText = `You are a professional educator. Your task is to generate a comprehensive learning outline for the topic: "${promptInput.topic}" in the language: ${promptInput.language}.

The outline should be structured logically to facilitate learning, starting from a high-level overview and progressively diving into details.

The structure should follow this pattern:
1.  Start with "Tại sao cần học chủ đề này?".
2.  Include a "Lịch sử và Bối cảnh" chapter if relevant.
3.  List the core concepts as separate chapter titles.
4.  Include chapters on practical applications or advanced topics if applicable.
5.  End with a "Tổng kết" or "Tóm tắt" chapter.

Generate between 5 and 10 chapter titles. Each title must be on a new line. Do not include numbers or bullet points.`;

      const generationConfig: GenerationConfig = {
        responseMimeType: "text/plain",
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
      
      const outlineArray = result.response.text().split('\n').filter(line => line.trim() !== '');
      const parsedJson = { outline: outlineArray };
      const validatedOutput = GenerateTheoryOutlineOutputSchema.parse(parsedJson);

      console.log(`✅ Generated theory outline with ${validatedOutput.outline.length} chapters.`);
      return { result: validatedOutput, newApiKeyIndex: currentKeyIndex };

    } catch (error: any) {
        const errorMessage = error.message || '';
        const isQuotaError = errorMessage.includes('429');
        const isBadApiKeyError = errorMessage.includes('400');
        
        console.warn(`API Key at index ${currentKeyIndex} failed. Reason: ${errorMessage}`);
        
        if (isQuotaError) quotaErrorCount++;
        if (isBadApiKeyError) invalidKeyCount++;

        if ((isQuotaError || isBadApiKeyError) && i < apiKeys.length - 1) {
            currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
            console.log(`Trying next API Key at index ${currentKeyIndex}.`);
        } else {
            console.error('❌ Theory outline generation error:', error);
            if (error instanceof z.ZodError) {
              throw new AIOperationError('AI đã trả về dữ liệu không hợp lệ. Vui lòng thử lại.', 'AI_INVALID_FORMAT');
            }
             if (error.message?.includes('JSON')) {
                throw new AIOperationError('AI đã trả về dữ liệu không hợp lệ. Vui lòng thử lại.', 'AI_INVALID_FORMAT');
            }
            if (invalidKeyCount === apiKeys.length) {
                throw new AIOperationError('Tất cả API key đều không hợp lệ. Vui lòng kiểm tra lại.', 'ALL_KEYS_FAILED');
            }
            if (quotaErrorCount === apiKeys.length) {
                throw new AIOperationError('Tất cả API key đều đã hết dung lượng. Vui lòng thử lại sau.', 'ALL_KEYS_FAILED');
            }
            throw new AIOperationError('Không thể tạo dàn bài từ AI.', 'AI_GENERATION_FAILED');
        }
    }
  }

  // If all keys failed
  if (invalidKeyCount === apiKeys.length) {
    throw new AIOperationError('Tất cả API key đều không hợp lệ. Vui lòng kiểm tra lại trong Cài đặt.', 'ALL_KEYS_FAILED');
  }
  if (quotaErrorCount === apiKeys.length) {
      throw new AIOperationError('Tất cả API key đều đã hết dung lượng. Vui lòng thử lại sau hoặc thêm key mới.', 'ALL_KEYS_FAILED');
  }
  throw new AIOperationError('Tất cả các API key đều không thành công. Vui lòng kiểm tra lại.', 'ALL_KEYS_FAILED');
}
