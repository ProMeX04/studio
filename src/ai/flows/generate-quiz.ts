'use server';

/**
 * @fileOverview Quiz generation flow for a given topic.
 *
 * - generateQuiz - A function that generates a quiz for a given topic.
 */

import {ai} from '@/ai/genkit';
import { GenerateQuizInputSchema, GenerateQuizOutputSchema, GenerateQuizInput, GenerateQuizOutput } from '@/ai/schemas';

export async function generateQuiz(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  return generateQuizFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateQuizPrompt',
  input: {schema: GenerateQuizInputSchema},
  output: {schema: GenerateQuizOutputSchema},
  prompt: `You are a quiz generator. Generate a {{{count}}}-question multiple-choice quiz for the topic: {{{topic}}} in the language: {{{language}}}. Each question should have 4 options, a single correct answer, and an explanation for the answer.

{{#if existingQuestions}}
You have already generated the following questions. Do not repeat them or create questions with very similar content.

Existing Questions:
{{#each existingQuestions}}
- "{{{this.question}}}"
{{/each}}
{{/if}}

Return a JSON array of objects with "question", "options", "answer", and "explanation" keys.

For example:
[
    {
        "question": "What is the powerhouse of the cell?",
        "options": ["Nucleus", "Ribosome", "Mitochondrion", "Endoplasmic Reticulum"],
        "answer": "Mitochondrion",
        "explanation": "The mitochondrion is known as the powerhouse of the cell because it generates most of the cell's supply of adenosine triphosphate (ATP), used as a source of chemical energy."
    },
    {
        "question": "What is the capital of Japan?",
        "options": ["Beijing", "Seoul", "Tokyo", "Bangkok"],
        "answer": "Tokyo",
        "explanation": "Tokyo is the capital and largest city of Japan. It is located on the eastern coast of the main island Honshu."
    }
]`,
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
