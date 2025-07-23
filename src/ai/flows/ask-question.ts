
'use server';

/**
 * @fileOverview Flow to answer a user's text question based on context.
 */

import {ai} from '@/ai/genkit';
import { AskQuestionInputSchema, AskQuestionOutputSchema, type AskQuestionInput, type AskQuestionOutput } from '@/ai/schemas';

export async function askQuestion(input: AskQuestionInput): Promise<AskQuestionOutput> {
  return askQuestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'askQuestionPrompt',
  input: {schema: AskQuestionInputSchema},
  output: {schema: AskQuestionOutputSchema},
  prompt: `You are a helpful AI tutor. The user has a question about the learning material they are currently viewing.

Here is the context of what the user is seeing:
{{{context}}}

Here is the conversation history so far:
{{#each history}}
- {{this.role}}: {{this.text}}
{{/each}}

Here is the user's new question:
"{{{question}}}"

Please provide a concise and helpful answer to the user's question based on the provided context and history. After the answer, provide two relevant follow-up questions the user might have. These suggestions should help the user explore the topic further.

IMPORTANT: Your response MUST be a valid JSON object with the keys "answer" and "suggestions". For example: {"answer": "This is the answer.", "suggestions": ["Follow-up 1?", "Follow-up 2?"]}.
`,
});

const askQuestionFlow = ai.defineFlow(
  {
    name: 'askQuestionFlow',
    inputSchema: AskQuestionInputSchema,
    outputSchema: AskQuestionOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
