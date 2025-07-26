
/**
 * @fileOverview Typing content generation flow using Google Generative AI SDK.
 *
 * - generateTypingContent - A function that generates content suitable for typing practice.
 */

import { GoogleGenerativeAI, GenerationConfig, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { z } from 'zod';
import { GenerateCardsInputSchema, GenerateCardsOutputContainerSchema, GenerateCardsOutput, GenerateCardsJsonSchema } from '@/ai/schemas';
import { AIOperationError } from '@/lib/ai-utils';

const GenerateTypingClientInputSchema = GenerateCardsInputSchema.extend({
    apiKeys: z.array(z.string()),
    apiKeyIndex: z.number(),
});
type GenerateTypingClientInput = z.infer<typeof GenerateTypingClientInputSchema>;

export async function generateTypingContent(
  input: GenerateTypingClientInput
): Promise<{ result: GenerateCardsOutput; newApiKeyIndex: number }> {
  const { apiKeys, apiKeyIndex, ...promptInput } = input;
  
  if (!apiKeys || apiKeys.length === 0) {
    throw new AIOperationError('API key is required.', 'API_KEY_REQUIRED');
  }

  let currentKeyIndex = apiKeyIndex;

  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[currentKeyIndex];

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

      const existingCardsPrompt = promptInput.existingCards && promptInput.existingCards.length > 0 
        ? `
      You have already generated the following content. Do not repeat them or create items with very similar content.

      Existing Content:
      ${promptInput.existingCards.map(card => `- Title: "${card.front}" / Content: "${card.back}"`).join('\n')}
      ` 
        : '';

      const promptText = `You are a code snippet generator for a typing practice app. Generate a set of ${promptInput.count} new, unique code snippets for the topic: "${promptInput.topic}" in the programming language that best fits the topic. If no programming language is obvious, use JavaScript. Populate the "cards" array in the JSON object.
- The "front" field should be a short title describing the code snippet (e.g., "JavaScript: Factorial Function").
- The "back" field should be the actual code snippet for the user to type. This content should be between 100 and 400 characters and must be valid Markdown code block format.
${existingCardsPrompt}
The "back" field must be formatted as a valid Markdown code block, for example: \`\`\`javascript\nconsole.log("Hello, World!");\n\`\`\`
The "front" field MUST be plain text.`;

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

      console.log(`✅ Generated ${validatedOutput.cards.length} valid typing content items`);
      return { result: validatedOutput.cards, newApiKeyIndex: currentKeyIndex };

    } catch (error: any) {
        const isQuotaError = error.message?.includes('quota');
        console.warn(`API Key at index ${currentKeyIndex} failed.`, error.message);
        
        if (isQuotaError && i < apiKeys.length - 1) {
            currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
            console.log(`Quota error. Trying next API Key at index ${currentKeyIndex}.`);
        } else {
            console.error('❌ Typing content generation error:', error);
            if (error.message.includes('JSON')) {
                throw new AIOperationError('AI returned an invalid data format.', 'AI_INVALID_FORMAT');
            }
            if (error instanceof z.ZodError) {
              throw new AIOperationError('AI returned an invalid data format.', 'AI_INVALID_FORMAT');
            }
            throw new AIOperationError('Failed to generate typing content from AI.', 'AI_GENERATION_FAILED');
        }
    }
  }

  // If all keys failed
  throw new AIOperationError('All API keys failed due to quota or other issues.', 'ALL_KEYS_FAILED');
}
