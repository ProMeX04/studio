
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


  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[currentKeyIndex];

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName });

      const promptText = `Bạn là một chuyên gia về sơ đồ tư duy. Dựa vào nội dung lý thuyết được cung cấp cho chương "${promptInput.chapterTitle}" thuộc chủ đề "${promptInput.topic}", hãy tạo một sơ đồ tư duy (mind map) theo cấu trúc JSON.

Nội dung lý thuyết:
---
${promptInput.theoryContent}
---

Yêu cầu về cấu trúc JSON:
1.  Bắt đầu với một nút gốc (root node) duy nhất có thuộc tính "name" là tên của chương ("${promptInput.chapterTitle}").
2.  Từ nút gốc, phân tích nội dung để xác định các khái niệm chính và tạo các nút con (children) tương ứng.
3.  Tiếp tục phân rã từng khái niệm chính thành các ý nhỏ hơn, chi tiết hơn dưới dạng các nút con lồng nhau.
4.  Chỉ bao gồm các thuộc tính "name" và "children" cho mỗi nút. "children" là một mảng các nút con và là không bắt buộc.
5.  Sơ đồ cần có độ sâu ít nhất là 2-3 cấp độ để thể hiện rõ mối quan hệ giữa các khái niệm.
6.  Sử dụng ngôn ngữ: ${promptInput.language}.
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
        
        console.warn(`API Key at index ${currentKeyIndex} failed. Reason: ${errorMessage}`);
        
        if (isQuotaError) quotaErrorCount++;
        if (isBadApiKeyError) invalidKeyCount++;

        if ((isQuotaError || isBadApiKeyError) && i < apiKeys.length - 1) {
            currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
            console.log(`Trying next API Key at index ${currentKeyIndex}.`);
        } else {
            console.error('❌ Mind Map generation error:', error);
            if (error.message.includes('JSON') || error instanceof z.ZodError) {
                throw new AIOperationError('AI đã trả về dữ liệu không hợp lệ. Vui lòng thử lại.', 'AI_INVALID_FORMAT');
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

  // If all keys failed
  throw new AIOperationError('Tất cả các API key đều không thành công. Vui lòng kiểm tra lại.', 'ALL_KEYS_FAILED');
}
