
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
  prompt: `You are a flashcard generator. Generate a set of {{{count}}} new, unique flashcards for the topic: {{{topic}}} in the language: {{{language}}}. Each flashcard should have a front and back.

Use Markdown for formatting, such as bolding for keywords or code snippets for code. For example: '**What** is the capital of France?' or 'What does \`console.log()\` do?'. Use the standard backtick character (\`) for inline code blocks.

{{#if existingCards}}
You have already generated the following flashcards. Do not repeat them or create cards with very similar content.

Existing Flashcards:
{{#each existingCards}}
- Front: "{{{this.front}}}" / Back: "{{{this.back}}}"
{{/each}}
{{/if}}

IMPORTANT: Your response MUST be a valid JSON array of objects, where each object has a "front" and a "back" key. For example: [{"front": "Question 1", "back": "Answer 1"}, {"front": "Question 2", "back": "Answer 2"}].
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
