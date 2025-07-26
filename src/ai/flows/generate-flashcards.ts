
/**
 * @fileOverview Flashcard generation flow using Google Generative AI SDK.
 *
 * - generateFlashcards - A function that generates flashcards for a given topic.
 */

import { GoogleGenerativeAI, GenerationConfig, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { z } from 'zod';
import { GenerateCardsInputSchema, GenerateCardsOutputContainerSchema, GenerateCardsOutput, GenerateCardsJsonSchema } from '@/ai/schemas';
import { AIOperationError } from '@/lib/ai-utils';

const GenerateFlashcardsClientInputSchema = GenerateCardsInputSchema.extend({
    apiKeys: z.array(z.string()),
    apiKeyIndex: z.number(),
});
type GenerateFlashcardsClientInput = z.infer<typeof GenerateFlashcardsClientInputSchema>;

export async function generateFlashcards(
  input: GenerateFlashcardsClientInput
): Promise<{ result: GenerateCardsOutput; newApiKeyIndex: number }> {
  const { apiKeys, apiKeyIndex, ...promptInput } = input;
  
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
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

      const existingCardsPrompt = promptInput.existingCards && promptInput.existingCards.length > 0 
        ? `
      You have already generated the following flashcards. Do not repeat them or create cards with very similar content.

      Existing Flashcards:
      ${promptInput.existingCards.map(card => `- Front: "${card.front}" / Back: "${card.back}"`).join('\n')}
      ` 
        : '';

      const promptText = `You are a flashcard generator. Generate a set of ${promptInput.count} new, unique flashcards for the topic: ${promptInput.topic} in the language: ${promptInput.language}. Populate the "cards" array in the JSON object. Each flashcard should have a "front" (a question or term) and a "back" (the answer or definition).
      ${existingCardsPrompt}
      The "front" and "back" fields MUST contain valid standard Markdown.
      - Use standard backticks (\`) for inline code blocks.
      - Use triple backticks with a language identifier for multi-line code blocks.
      - For mathematical notations, use standard LaTeX syntax: $...$ for inline math and $$...$$ for block-level math.
      `;

      const generationConfig: GenerationConfig = {
        responseMimeType: "application/json",
        // @ts-ignore - responseSchema is a valid property
        responseSchema: GenerateCardsJsonSchema,
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
      const validatedOutput = GenerateCardsOutputContainerSchema.parse(parsedJson);

      console.log(`✅ Generated ${validatedOutput.cards.length} valid flashcards`);
      return { result: validatedOutput.cards, newApiKeyIndex: currentKeyIndex };

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
            console.error('❌ Flashcard generation error:', error);
            if (error.message.includes('JSON') || error instanceof z.ZodError) {
                throw new AIOperationError('AI đã trả về dữ liệu không hợp lệ. Vui lòng thử lại.', 'AI_INVALID_FORMAT');
            }
            // After loop, check what kind of error happened most
            if (invalidKeyCount === apiKeys.length) {
                throw new AIOperationError('Tất cả API key đều không hợp lệ. Vui lòng kiểm tra lại.', 'ALL_KEYS_FAILED');
            }
            if (quotaErrorCount === apiKeys.length) {
                throw new AIOperationError('Tất cả API key đều đã hết dung lượng. Vui lòng thử lại sau.', 'ALL_KEYS_FAILED');
            }
            throw new AIOperationError('Không thể tạo flashcard từ AI.', 'AI_GENERATION_FAILED');
        }
    }
  }

  // This part is now reached if all keys fail and the loop completes
  if (invalidKeyCount === apiKeys.length) {
      throw new AIOperationError('Tất cả API key đều không hợp lệ. Vui lòng kiểm tra lại trong Cài đặt.', 'ALL_KEYS_FAILED');
  }
  if (quotaErrorCount === apiKeys.length) {
      throw new AIOperationError('Tất cả API key đều đã hết dung lượng. Vui lòng thử lại sau hoặc thêm key mới.', 'ALL_KEYS_FAILED');
  }
  throw new AIOperationError('Tất cả các API key đều không thành công. Vui lòng kiểm tra lại.', 'ALL_KEYS_FAILED');
}
