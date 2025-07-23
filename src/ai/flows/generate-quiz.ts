
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

Use Markdown for formatting the question, options, and explanation. For example, you can use bolding for keywords or code snippets for code.

{{#if existingQuestions}}
You have already generated the following questions. Do not repeat them or create questions with very similar content.

Existing Questions:
{{#each existingQuestions}}
- "{{{this.question}}}"
{{/each}}
{{/if}}

Return a JSON array of objects with "question", "options", "answer", and "explanation" keys.
`,
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
