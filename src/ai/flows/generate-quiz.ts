// src/ai/flows/generate-quiz.ts
'use server';
/**
 * @fileOverview A quiz generator AI agent.
 *
 * - generateQuiz - A function that handles the quiz generation process.
 * - addQuizToDb - A function that generates a quiz and adds it to Firestore.
 * - GenerateQuizInput - The input type for the generateQuiz function.
 * - GenerateQuizOutput - The return type for the generateQuiz function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const GenerateQuizInputSchema = z.object({
  topic: z.string().describe('The topic for the quiz.'),
});
export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

const GenerateQuizOutputSchema = z.object({
  quiz: z.string().describe('The generated quiz in JSON format.'),
});
export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;

export async function generateQuiz(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  return generateQuizFlow(input);
}

export async function addQuizToDb(input: GenerateQuizInput): Promise<void> {
    const quiz = await generateQuizFlow(input);
    await addDoc(collection(db, 'quizzes'), {
        topic: input.topic,
        quiz: quiz.quiz,
        createdAt: serverTimestamp(),
    });
}

const prompt = ai.definePrompt({
  name: 'generateQuizPrompt',
  input: {schema: GenerateQuizInputSchema},
  output: {schema: GenerateQuizOutputSchema},
  prompt: `You are a quiz generator. Generate a quiz with 5 questions on the following topic: {{{topic}}}. The quiz should be returned as a JSON object with a "questions" key, which is an array of question objects. Each question object should have a "question" (string), "options" (array of 4 strings), and an "answer" (string). Make sure that the JSON is parseable.`, 
});

const generateQuizFlow = ai.defineFlow(
  {
    name: 'generateQuizFlow',
    inputSchema: GenerateQuizInputSchema,
    outputSchema: GenerateQuizOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
