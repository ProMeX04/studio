
'use server';

/**
 * @fileOverview Flashcard generation flow for a given topic.
 *
 * - generateFlashcards - A function that generates flashcards for a given topic.
 */

import {ai} from '@/ai/genkit';
import { GenerateFlashcardsInputSchema, GenerateFlashcardsOutputSchema, GenerateFlashcardsInput, GenerateFlashcardsOutput } from '@/ai/schemas';

// Regex to find and replace non-standard backticks with standard ones.
const backtickRegex = /`|´|‘|’/g;

export async function generateFlashcards(input: GenerateFlashcardsInput): Promise<GenerateFlashcardsOutput> {
  return generateFlashcardsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFlashcardsPrompt',
  input: {schema: GenerateFlashcardsInputSchema},
  output: {schema: GenerateFlashcardsOutputSchema},
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

const generateFlashcardsFlow = ai.defineFlow(
  {
    name: 'generateFlashcardsFlow',
    inputSchema: GenerateFlashcardsInputSchema,
    outputSchema: GenerateFlashcardsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('AI failed to generate flashcards.');
    }
    
    // Clean each flashcard to ensure proper markdown rendering.
    return output.map(card => ({
      front: card.front.replace(backtickRegex, '`'),
      back: card.back.replace(backtickRegex, '`'),
    }));
  }
);
