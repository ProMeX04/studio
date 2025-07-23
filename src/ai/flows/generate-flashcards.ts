'use server';

/**
 * @fileOverview Flashcard generation flow for a given topic.
 *
 * - generateFlashcards - A function that generates flashcards for a given topic.
 */

import {ai} from '@/ai/genkit';
import { GenerateFlashcardsInputSchema, GenerateFlashcardsOutputSchema, GenerateFlashcardsInput, GenerateFlashcardsOutput } from '@/ai/schemas';

export async function generateFlashcards(input: GenerateFlashcardsInput): Promise<GenerateFlashcardsOutput> {
  return generateFlashcardsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFlashcardsPrompt',
  input: {schema: GenerateFlashcardsInputSchema},
  output: {schema: GenerateFlashcardsOutputSchema},
  prompt: `You are a flashcard generator. Generate a set of {{{count}}} new, unique flashcards for the topic: {{{topic}}} in the language: {{{language}}}. Each flashcard should have a front and back.

{{#if existingCards}}
You have already generated the following flashcards. Do not repeat them or create cards with very similar content.

Existing Flashcards:
{{#each existingCards}}
- Front: "{{{this.front}}}" / Back: "{{{this.back}}}"
{{/each}}
{{/if}}

Return a JSON array of objects with "front" and "back" keys.

For example:

[
  {
    "front": "What is the capital of France?",
    "back": "Paris"
  },
  {
    "front": "What is the highest mountain in the world?",
    "back": "Mount Everest"
  }
]
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
    return output!;
  }
);
