
'use server';
/**
 * @fileOverview Genkit flow to generate flashcards based on theory content.
 */

import { ai } from '@/lib/genkit-service';
import { z } from 'zod';
import { CardSchema, GenerateCardsOutputSchema, GenerateCardsOutputContainerSchema } from '@/ai/schemas';

const GenerateFlashcardsInputSchema = z.object({
  topic: z.string().describe('The main topic of the course.'),
  language: z.string().describe('The language for the flashcards.'),
  theoryContent: z.string().describe('The full theory content to base the flashcards on.'),
  count: z.number().optional().default(15).describe('The desired number of flashcards.'),
});

export async function generateFlashcards(input: z.infer<typeof GenerateFlashcardsInputSchema>): Promise<z.infer<typeof GenerateCardsOutputSchema>> {
  const prompt = ai.definePrompt({
    name: 'generateFlashcardsPrompt',
    input: { schema: GenerateFlashcardsInputSchema },
    output: { schema: GenerateCardsOutputContainerSchema },
    prompt: `
      You are an expert in creating effective learning materials. Based on the provided theory content about "{{topic}}", generate a set of {{count}} flashcards.

      The flashcards must be in {{language}}.

      Each flashcard should have a 'front' (a question or term) and a 'back' (the answer or definition). The questions should test key concepts, definitions, and important facts from the theory.

      **Theory Content:**
      ---
      {{{theoryContent}}}
      ---

      Generate exactly {{count}} flashcards.
    `,
  });

  const { output } = await prompt(input);
  return output?.cards ?? [];
}
