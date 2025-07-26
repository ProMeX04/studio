
/**
 * @fileOverview Flashcard generation flow using Google Generative AI SDK.
 *
 * - generateFlashcards - A function that generates flashcards for a given topic.
 */

import { GoogleGenerativeAI, GenerationConfig, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { z } from 'zod';
import { GenerateFlashcardsInputSchema, GenerateFlashcardsOutputContainerSchema, GenerateFlashcardsOutput, GenerateFlashcardsJsonSchema } from '@/ai/schemas';
import { AIOperationError } from '@/lib/ai-utils';

const GenerateFlashcardsClientInputSchema = GenerateFlashcardsInputSchema.extend({
    apiKey: z.string().optional(),
});
type GenerateFlashcardsClientInput = z.infer<typeof GenerateFlashcardsClientInputSchema>;

export async function generateFlashcards(input: GenerateFlashcardsClientInput): Promise<GenerateFlashcardsOutput> {
  if (!input.apiKey) {
    throw new AIOperationError('API key is required.', 'API_KEY_REQUIRED');
  }
  
  const genAI = new GoogleGenerativeAI(input.apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

  const existingCardsPrompt = input.existingCards && input.existingCards.length > 0 
    ? `
You have already generated the following flashcards. Do not repeat them or create cards with very similar content.

Existing Flashcards:
${input.existingCards.map(card => `- Front: "${card.front}" / Back: "${card.back}"`).join('\n')}
` 
    : '';

  const promptText = `You are a flashcard generator. Generate a set of ${input.count} new, unique flashcards for the topic: ${input.topic} in the language: ${input.language}. Populate the "cards" array in the JSON object. Each flashcard should have a "front" and a "back".
${existingCardsPrompt}
The "front" and "back" fields MUST contain valid standard Markdown.
- Use standard backticks (\`) for inline code blocks.
- Use triple backticks with a language identifier for multi-line code blocks.
- For mathematical notations, use standard LaTeX syntax: $...$ for inline math and $$...$$ for block-level math.
`;

  const generationConfig: GenerationConfig = {
    responseMimeType: "application/json",
    // @ts-ignore - responseSchema is a valid property
    responseSchema: GenerateFlashcardsJsonSchema,
  };

  try {
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
    const validatedOutput = GenerateFlashcardsOutputContainerSchema.parse(parsedJson);

    console.log(`✅ Generated ${validatedOutput.cards.length} valid flashcards`);
    return validatedOutput.cards;

  } catch (error: any) {
    console.error('❌ Flashcard generation error:', error);
     if (error.message.includes('JSON')) {
        throw new AIOperationError('AI returned an invalid data format.', 'AI_INVALID_FORMAT');
    }
     if (error instanceof z.ZodError) {
      throw new AIOperationError('AI returned an invalid data format.', 'AI_INVALID_FORMAT');
    }
    throw new AIOperationError('Failed to generate flashcards from AI.', 'AI_GENERATION_FAILED');
  }
}
