
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
    try {
      const {output} = await prompt(input);
      if (!output) {
        throw new Error("AI did not return an answer.");
      }
      
      // Validate output structure
      if (typeof output.answer !== 'string' || !output.answer.trim()) {
        throw new Error("AI returned invalid answer format");
      }
      
      // Validate suggestions if present
      if (output.suggestions && (!Array.isArray(output.suggestions) || 
          output.suggestions.some(s => typeof s !== 'string'))) {
        throw new Error("AI returned invalid suggestions format");
      }
      
      return output;
    } catch (error: any) {
      console.error('❌ Ask question flow error:', error.message);
      
      // Return a fallback response instead of throwing
      return {
        answer: "Xin lỗi, tôi không thể trả lời câu hỏi này lúc này. Vui lòng thử lại sau.",
        suggestions: ["Bạn có thể đặt lại câu hỏi không?", "Cần tôi giải thích chủ đề khác không?"]
      };
    }
  }
);
