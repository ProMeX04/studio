'use server';

/**
 * @fileOverview Flow to explain a specific quiz answer option.
 *
 * - explainQuizOption - A function that generates an explanation for a given quiz option.
 * - ExplainQuizOptionInput - The input type for the explainQuizOption function.
 * - ExplainQuizOptionOutput - The return type for the explainQuizOption function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExplainQuizOptionInputSchema = z.object({
  topic: z.string().describe('The general topic of the quiz.'),
  question: z.string().describe('The quiz question.'),
  selectedOption: z.string().describe('The answer option the user wants an explanation for.'),
  correctAnswer: z.string().describe('The correct answer to the question.'),
});

export type ExplainQuizOptionInput = z.infer<typeof ExplainQuizOptionInputSchema>;

const ExplainQuizOptionOutputSchema = z.object({
    explanation: z.string().describe('The detailed explanation for the selected option.')
});

export type ExplainQuizOptionOutput = z.infer<typeof ExplainQuizOptionOutputSchema>;

export async function explainQuizOption(input: ExplainQuizOptionInput): Promise<ExplainQuizOptionOutput> {
  return explainQuizOptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'explainQuizOptionPrompt',
  input: {schema: ExplainQuizOptionInputSchema},
  output: {schema: ExplainQuizOptionOutputSchema},
  prompt: `You are a helpful quiz tutor. The user has answered a question and now wants a more detailed explanation for one of the answer options.

Topic: {{{topic}}}
Question: "{{{question}}}"
Correct Answer: "{{{correctAnswer}}}"
Option to Explain: "{{{selectedOption}}}"

{{#if (eq selectedOption correctAnswer)}}
The user has chosen the CORRECT answer and wants a more detailed explanation. Please provide a more in-depth explanation of why "{{{selectedOption}}}" is the correct answer. You can provide additional context or interesting facts related to the topic.
{{else}}
The user has chosen an INCORRECT answer and wants to know why it's wrong. Please explain specifically why "{{{selectedOption}}}" is not the correct answer for the question "{{{question}}}".
{{/if}}

Please provide a clear and concise explanation.
`,
});

const explainQuizOptionFlow = ai.defineFlow(
  {
    name: 'explainQuizOptionFlow',
    inputSchema: ExplainQuizOptionInputSchema,
    outputSchema: ExplainQuizOptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
