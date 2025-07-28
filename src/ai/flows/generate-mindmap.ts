
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

function extractJson(text: string): string | null {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/);
  return match ? match[1].trim() : null;
}

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

      const promptText = `Bạn là một chuyên gia về sơ đồ tư duy. Dựa vào nội dung lý thuyết được cung cấp cho chương "${promptInput.chapterTitle}" thuộc chủ đề "${promptInput.topic}", hãy tạo một sơ đồ tư duy (mind map).

Nội dung lý thuyết:
---
${promptInput.theoryContent}
---

Yêu cầu:
1.  Phân tích nội dung để xác định các khái niệm chính và tạo các nút con (children) tương ứng.
2.  Tiếp tục phân rã từng khái niệm chính thành các ý nhỏ hơn, chi tiết hơn dưới dạng các nút con lồng nhau.
3.  Sơ đồ cần có độ sâu ít nhất là 2-3 cấp độ để thể hiện rõ mối quan hệ giữa các khái niệm.
4.  Sử dụng ngôn ngữ: ${promptInput.language}.
5.  Toàn bộ đầu ra phải là một khối mã JSON duy nhất, được bao bọc trong \`\`\`json và \`\`\`.
6.  Đối tượng JSON phải tuân theo cấu trúc sau:
    - Bắt đầu với một nút gốc (root node) duy nhất có thuộc tính "name" là tên của chương ("${promptInput.chapterTitle}").
    - Mỗi nút chỉ bao gồm các thuộc tính "name" và "children" (tùy chọn).
`;

      const generationConfig: GenerationConfig = {
        responseMimeType: "text/plain",
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
      
      const rawText = result.response.text();
      const jsonString = extractJson(rawText);

      if (!jsonString) {
        throw new AIOperationError('AI đã trả về dữ liệu không hợp lệ. Khối JSON không được tìm thấy.', 'AI_INVALID_FORMAT');
      }

      const parsedJson = JSON.parse(jsonString);
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
            if (error.message.includes('JSON') || error instanceof z.ZodError || error instanceof AIOperationError) {
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
