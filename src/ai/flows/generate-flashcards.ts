/**
 * @fileOverview Flashcard generation flow for a given topic.
 *
 * - generateFlashcards - A function that generates flashcards for a given topic.
 */

import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { GenerateFlashcardsInputSchema, GenerateFlashcardsOutputSchema, GenerateFlashcardsInput, GenerateFlashcardsOutput } from '@/ai/schemas';
import { AIOperationError } from '@/lib/ai-utils';


const GenerateFlashcardsClientInputSchema = GenerateFlashcardsInputSchema.extend({
    apiKey: z.string().optional(),
});
type GenerateFlashcardsClientInput = z.infer<typeof GenerateFlashcardsClientInputSchema>;


export async function generateFlashcards(input: GenerateFlashcardsClientInput): Promise<GenerateFlashcardsOutput> {
  if (!input.apiKey) {
    throw new AIOperationError('API key is required.', 'API_KEY_REQUIRED');
  }
  
  const ai = genkit({
    plugins: [googleAI({ apiKey: input.apiKey })],
  });

  const prompt = ai.definePrompt({
    name: 'generateFlashcardsPrompt',
    input: { schema: GenerateFlashcardsInputSchema },
    output: { schema: GenerateFlashcardsOutputSchema },
    prompt: `You are a flashcard generator. Generate a set of {{{count}}} new, unique flashcards for the topic: {{{topic}}} in the language: {{{language}}}. Each flashcard should have a "front" and a "back".

{{#if existingCards}}
You have already generated the following flashcards. Do not repeat them or create cards with very similar content.

Existing Flashcards:
{{#each existingCards}}
- Front: "{{{this.front}}}" / Back: "{{{this.back}}}"
{{/each}}
{{/if}}

IMPORTANT: Your response MUST be a valid JSON array of objects, where each object has a "front" and a "back" key. The "front" and "back" fields MUST contain valid standard Markdown.
- Use standard backticks (\`) for inline code blocks (e.g., \`my_variable\`).
- Use triple backticks with a language identifier for multi-line code blocks (e.g., \`\`\`python... \`\`\`).
- Use bolding for keywords, like **this**.
- For mathematical notations, use standard LaTeX syntax: $...$ for inline math and $$...$$ for block-level math.
- For example: [{"front": "What does \`console.log()\` do?", "back": "It prints a message to the web console."}, {"front": "What is the Pythagorean theorem?", "back": "It is defined as: $$a^2 + b^2 = c^2$$"}]
`,
  });

  try {
    const { output } = await prompt(input);

    if (!output) {
      throw new Error('AI_EMPTY_RESPONSE');
    }

    if (!Array.isArray(output)) {
      throw new Error('AI_INVALID_FORMAT');
    }

    for (const card of output) {
      if (!card.front || !card.back || typeof card.front !== 'string' || typeof card.back !== 'string') {
        throw new Error('AI_INVALID_FLASHCARD');
      }
    }

    console.log(`✅ Generated ${output.length} valid flashcards`);
    return output;

  } catch (error: any) {
    console.error('❌ Flashcard generation error:', error.message);

    if (error.message.startsWith('AI_')) {
      throw error;
    }

    throw new Error('AI_GENERATION_FAILED');
  }
}
