'use server';

/**
 * @fileOverview Flow to explain a specific quiz answer option.
 *
 * - explainQuizOption - A function that generates an explanation for a given quiz option.
 */

import {ai} from '@/ai/genkit';
import { ExplainQuizOptionInputSchema, ExplainQuizOptionOutputSchema, type ExplainQuizOptionInput, type ExplainQuizOptionOutput } from '@/ai/schemas';

export async function explainQuizOption(input: ExplainQuizOptionInput): Promise<ExplainQuizOptionOutput> {
  return explainQuizOptionFlow(input);
}

const correctAnswerPrompt = ai.definePrompt({
  name: 'correctAnswerPrompt',
  input: {schema: ExplainQuizOptionInputSchema},
  output: {schema: ExplainQuizOptionOutputSchema},
  prompt: `You are a helpful quiz tutor. The user has chosen the CORRECT answer and wants a more detailed explanation.

Topic: {{{topic}}}
Question: "{{{question}}}"
Correct Answer: "{{{correctAnswer}}}"

Please provide a more in-depth explanation of why "{{{selectedOption}}}" is the correct answer for the question "{{{question}}}". You can provide additional context or interesting facts related to the topic.
`,
});

const incorrectAnswerPrompt = ai.definePrompt({
    name: 'incorrectAnswerPrompt',
    input: {schema: ExplainQuizOptionInputSchema},
    output: {schema: ExplainQuizOptionOutputSchema},
    prompt: `You are a helpful quiz tutor. The user has chosen an INCORRECT answer and wants to know why it's wrong.

Topic: {{{topic}}}
Question: "{{{question}}}"
Correct Answer: "{{{correctAnswer}}}"
The Incorrect Option to Explain: "{{{selectedOption}}}"

Please explain specifically why "{{{selectedOption}}}" is not the correct answer for the question "{{{question}}}".
`,
});


const explainQuizOptionFlow = ai.defineFlow(
  {
    name: 'explainQuizOptionFlow',
    inputSchema: ExplainQuizOptionInputSchema,
    outputSchema: ExplainQuizOptionOutputSchema,
  },
  async input => {
    if (input.selectedOption === input.correctAnswer) {
        const {output} = await correctAnswerPrompt(input);
        return output!;
    } else {
        const {output} = await incorrectAnswerPrompt(input);
        return output!;
    }
  }
);
