
'use server';

/**
 * @fileOverview Mind Map generation flow using Google Generative AI SDK.
 *
 * - generateMindmap - A function that generates a mind map for a given chapter content.
 */

import { GoogleGenerativeAI, GenerationConfig, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { z } from 'zod';
import { GenerateMindMapInputSchema, GenerateMindMapOutputSchema, GenerateMindMapOutput, GenerateMindMapJsonSchema } from '@/ai/schemas';
import { AIOperationError } from '@/lib/ai-utils';

const ClientInputSchema = GenerateMindMapInputSchema.extend({
    apiKeys: z.array(z.string()),
    apiKeyIndex: z.number(),
});
type ClientInput = z.infer<typeof ClientInputSchema>;

export async function generateMindmap(
  input: ClientInput
): Promise<{ result: GenerateMindMapOutput; newApiKeyIndex: number }> {
  const { apiKeys, apiKeyIndex, model: modelName, ...promptInput } = input;
  
  if (!apiKeys || apiKeys.length === 0) {
    throw new AIOperationError('API key is required.', 'API_KEY_REQUIRED');
  }

  let currentKeyIndex = apiKeyIndex;
  let invalidKeyCount = 0;
  let quotaErrorCount = 0;
  const maxRetries = 3;


  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[currentKeyIndex];

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ model: modelName });

          const promptText = `Bạn là một chuyên gia về sơ đồ tư duy. Dựa vào nội dung lý thuyết được cung cấp cho chương "${promptInput.chapterTitle}" thuộc chủ đề "${promptInput.topic}", hãy tạo một danh sách các mối quan hệ cha-con để xây dựng sơ đồ tư duy.

Nội dung lý thuyết:
---
${promptInput.theoryContent}
---

Yêu cầu:
1.  Phân tích nội dung để xác định khái niệm chính (nút gốc) và các khái niệm phụ.
2.  Nút gốc của sơ đồ phải có tên chính xác là "${promptInput.chapterTitle}".
3.  Tạo một mảng JSON chứa các đối tượng, mỗi đối tượng biểu diễn một cạnh (mối quan hệ) trong sơ đồ.
4.  Mỗi đối tượng phải có hai thuộc tính: "parent" (tên của nút cha) và "child" (tên của nút con).
5.  Ví dụ: nếu "Khái niệm A" là chủ đề chính và có "Mục 1" và "Mục 2", bạn sẽ tạo các đối tượng: { "parent": "Khái niệm A", "child": "Mục 1" } và { "parent": "Khái niệm A", "child": "Mục 2" }.
6.  Toàn bộ đầu ra phải tuân thủ nghiêm ngặt schema JSON đã cho.
7.  Sử dụng ngôn ngữ: ${promptInput.language}.
`;

          const generationConfig: GenerationConfig = {
            responseMimeType: "application/json",
            // @ts-ignore - responseSchema is a valid property
            responseSchema: GenerateMindMapJsonSchema,
          };

          const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: promptText }] }],
            generationConfig,
            safetySettings: [
              { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ]
          });
          
          const parsedJson = JSON.parse(result.response.text());
          const validatedOutput = GenerateMindMapOutputSchema.parse(parsedJson);

          console.log(`✅ Generated Mind Map for chapter: "${promptInput.chapterTitle}"`);
          return { result: validatedOutput, newApiKeyIndex: currentKeyIndex };

        } catch (error: any) {
            const errorMessage = error.message || '';
            const isQuotaError = errorMessage.includes('429');
            const isBadApiKeyError = errorMessage.includes('400');
            const isInvalidFormatError = error.message.includes('JSON') || error instanceof z.ZodError;

            console.warn(`API Key at index ${currentKeyIndex} failed on attempt ${attempt}. Reason: ${errorMessage}`);
            
            if (isInvalidFormatError && attempt < maxRetries) {
                console.log(`Invalid format received. Retrying... (${attempt}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); 
                continue; 
            }

            if (isQuotaError) quotaErrorCount++;
            if (isBadApiKeyError) invalidKeyCount++;

            if ((isQuotaError || isBadApiKeyError) && i < apiKeys.length - 1) {
                currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
                console.log(`Trying next API Key at index ${currentKeyIndex}.`);
                break; 
            } 
            
            console.error('❌ Mind Map generation error:', error);
            if (isInvalidFormatError) {
                throw new AIOperationError('AI đã trả về dữ liệu không hợp lệ ngay cả sau khi thử lại. Vui lòng thử lại sau.', 'AI_INVALID_FORMAT');
            }
            if (invalidKeyCount === apiKeys.length) {
                throw new AIOperationError('Tất cả API key đều không hợp lệ. Vui lòng kiểm tra lại.', 'ALL_KEYS_FAILED');
            }
            if (quotaErrorCount === apiKeys.length) {
                throw new AIOperationError('Tất cả API key đều đã hết dung lượng. Vui lòng thử lại sau.', 'ALL_KEYS_FAILED');
            }
            throw new AIOperationError('Không thể tạo sơ đồ tư duy từ AI.', 'AI_GENERATION_FAILED');
        }
    }
  }

  throw new AIOperationError('Tất cả các API key đều không thành công. Vui lòng kiểm tra lại.', 'ALL_KEYS_FAILED');
}
