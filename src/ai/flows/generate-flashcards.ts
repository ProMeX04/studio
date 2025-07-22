'use server';

/**
 * @fileOverview Flashcard generation flow for a given topic.
 *
 * - generateFlashcards - A function that generates flashcards for a given topic.
 * - addFlashcardsToDb - A function that generates flashcards and adds them to Firestore.
 * - GenerateFlashcardsInput - The input type for the generateFlashcards function.
 * - GenerateFlashcardsOutput - The return type for the generateFlashcards function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';


const GenerateFlashcardsInputSchema = z.object({
  topic: z.string().describe('The topic for which to generate flashcards.'),
});

export type GenerateFlashcardsInput = z.infer<typeof GenerateFlashcardsInputSchema>;

const FlashcardSchema = z.object({
    front: z.string().describe('The front side of the flashcard.'),
    back: z.string().describe('The back side of the flashcard.'),
});

const GenerateFlashcardsOutputSchema = z.array(FlashcardSchema);

export type GenerateFlashcardsOutput = z.infer<typeof GenerateFlashcardsOutputSchema>;

export async function generateFlashcards(input: GenerateFlashcardsInput): Promise<GenerateFlashcardsOutput> {
  return generateFlashcardsFlow(input);
}

export async function addFlashcardsToDb(input: GenerateFlashcardsInput): Promise<void> {
    const flashcards = await generateFlashcardsFlow(input);
    await addDoc(collection(db, 'flashcards'), {
        topic: input.topic,
        cards: flashcards,
        createdAt: serverTimestamp(),
    });
}

const prompt = ai.definePrompt({
  name: 'generateFlashcardsPrompt',
  input: {schema: GenerateFlashcardsInputSchema},
  output: {schema: GenerateFlashcardsOutputSchema},
  prompt: `You are a flashcard generator. Generate a set of 5 flashcards for the topic: {{{topic}}}. Each flashcard should have a front and back.

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
