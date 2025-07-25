
'use server';

/**
 * @fileOverview Flow to generate content for a specific chapter of a theory document.
 */

import { GoogleGenerativeAI, GenerationConfig, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { z } from 'zod';
import { GenerateTheoryChapterInputSchema, GenerateTheoryChapterOutputSchema, GenerateTheoryChapterOutput } from '@/ai/schemas';
import { AIOperationError } from '@/lib/ai-utils';

const ClientInputSchema = GenerateTheoryChapterInputSchema.extend({
    apiKeys: z.array(z.string()),
    apiKeyIndex: z.number(),
});
type ClientInput = z.infer<typeof ClientInputSchema>;

export async function generateTheoryChapter(
  input: ClientInput
): Promise<{ result: GenerateTheoryChapterOutput; newApiKeyIndex: number }> {
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

      const promptText = `You are a professional educator and expert on the given topic. Your task is to write a detailed, well-structured, and in-depth chapter for a larger document.

Overall Topic: "${promptInput.topic}"
Current Chapter to Write: "${promptInput.chapterTitle}"
Language: ${promptInput.language}

Please write the content for this specific chapter. Explain the concepts thoroughly. Use clear headings (starting from h2 or h3), subheadings, bullet points, tables, and code examples where appropriate to structure the information logically.

The entire output must be a single, valid Markdown string.

The Markdown content MUST be valid standard Markdown.
- Use '##' or '###' for headings.
- Use standard backticks (\`) for inline code blocks.
- Use triple backticks with a language identifier for multi-line code blocks (e.g., \`\`\`javascript).
- For mathematical notations, use standard LaTeX syntax: $...$ for inline math and $$...$$ for block-level math.
- CRITICAL: Do NOT wrap the entire response in a markdown code block (\`\`\`...\`\`\`). The response should be raw markdown text.`;

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
      
      const parsedJson = { content: result.response.text() };
      const validatedOutput = GenerateTheoryChapterOutputSchema.parse(parsedJson);

      console.log(`✅ Generated content for chapter: "${promptInput.chapterTitle}"`);
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
            console.error('❌ Theory chapter generation error:', error);
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
            throw new AIOperationError('Không thể tạo chương lý thuyết từ AI.', 'AI_GENERATION_FAILED');
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
