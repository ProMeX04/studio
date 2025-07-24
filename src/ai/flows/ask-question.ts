
'use server';

/**
 * @fileOverview Flow to answer a user's text question based on context.
 */

import {ai} from '@/ai/genkit';
import { AskQuestionInputSchema, AskQuestionOutputSchema, type AskQuestionInput, type AskQuestionOutput } from '@/ai/schemas';

// Regex to find and replace non-standard backticks with standard ones.
const backtickRegex = /`|´|‘|’/g;

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

IMPORTANT: Your response MUST be a valid JSON object with the keys "answer" and "suggestions". The "answer" and "suggestions" fields must contain valid Markdown. Use standard backticks (\`) for inline code.
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
    if (!output) {
      throw new Error("AI did not return an answer.");
    }
    
    // Clean the answer text to ensure proper markdown rendering.
    output.answer = output.answer.replace(backtickRegex, '`');
    if (output.suggestions) {
        output.suggestions = output.suggestions.map(s => s.replace(backtickRegex, '`'));
    }

    return output;
  }
);
