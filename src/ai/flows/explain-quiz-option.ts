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
