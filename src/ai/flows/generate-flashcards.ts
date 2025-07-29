
/**
 * @fileOverview Flashcard generation flow using Google Generative AI SDK.
 *
 * - generateFlashcards - A function that generates flashcards for a given topic.
 */

import { z } from 'zod';
import { GenerationConfig, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { GenerateCardsInputSchema, GenerateCardsOutputContainerSchema, GenerateCardsOutput, GenerateCardsJsonSchema, CardData } from '@/ai/schemas';
import { performAIOperation } from '@/lib/ai-service';

const GenerateFlashcardsClientInputSchema = GenerateCardsInputSchema.extend({
    apiKeys: z.array(z.string()),
    apiKeyIndex: z.number(),
});
type GenerateFlashcardsClientInput = z.infer<typeof GenerateFlashcardsClientInputSchema>;

export async function generateFlashcards(
  input: GenerateFlashcardsClientInput
): Promise<{ result: GenerateCardsOutput; newApiKeyIndex: number }> {
  const { apiKeys, apiKeyIndex, model: modelName, ...promptInput } = input;
  
  return performAIOperation({
    apiKeys,
    apiKeyIndex,
    operation: async (genAI) => {
        const model = genAI.getGenerativeModel({ model: modelName });

        const existingCardsPrompt = promptInput.existingCards && promptInput.existingCards.length > 0 
          ? `
        You have already generated the following flashcards. Do not repeat them or create cards with very similar content.

        Existing Flashcards:
        ${promptInput.existingCards.map(card => `- Front: "${card.front}" / Back: "${card.back}"`).join('\n')}
        ` 
          : '';

        const theoryContextPrompt = promptInput.theoryContent
          ? `
        Base the flashcards EXCLUSIVELY on the following theory content. Do not introduce outside information.
        Theory Content:
        ---
        ${promptInput.theoryContent}
        ---
        `
          : `Generate flashcards for the topic: ${promptInput.topic}.`;

        const promptText = `You are a flashcard generator. Generate a set of ${promptInput.count} new, unique flashcards in the language: ${promptInput.language}.
        ${theoryContextPrompt}
        
        Populate the "cards" array in the JSON object. Each flashcard should have a "front" (a question or term) and a "back" (the answer or definition).
        
        The "front" and "back" fields MUST contain valid standard Markdown.
        - Use standard backticks (\`) for inline code blocks.
        - Use triple backticks with a language identifier for multi-line code blocks.
        - For mathematical notations, use standard LaTeX syntax: $...$ for inline math and $$...$$ for block-level math.
        
        The back of the card must end with the source of the information like this:
        (Nguồn: ${promptInput.source})
        
        ${existingCardsPrompt}
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
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          ]
        });
        
        const parsedJson = JSON.parse(result.response.text());
        const validatedOutput = GenerateCardsOutputContainerSchema.parse(parsedJson);

        console.log(`✅ Generated ${validatedOutput.cards.length} valid flashcards`);
        return validatedOutput.cards;
    }
  });
}
