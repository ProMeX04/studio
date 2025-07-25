
'use server';

/**
 * @fileOverview Streaming flow to answer a user's text question based on context.
 */

import {ai} from '@/ai/genkit';
import { AskQuestionInputSchema, type AskQuestionInput } from '@/ai/schemas';

export async function askQuestionStream(input: AskQuestionInput): Promise<ReadableStream<string>> {
  return askQuestionStreamFlow(input);
}

const askQuestionStreamFlow = ai.defineFlow(
  {
    name: 'askQuestionStreamFlow',
    inputSchema: AskQuestionInputSchema,
  },
  async (input) => {
    try {
      const {stream, response} = ai.generateStream({
        model: 'googleai/gemini-2.5-flash-lite',
        prompt: `You are a helpful AI tutor. The user has a question about the learning material they are currently viewing.

Here is the context of what the user is seeing:
${input.context}

Here is the conversation history so far:
${input.history.map(m => `- ${m.role}: ${m.text}`).join('\n')}

Here is the user's new question:
"${input.question}"

Please provide a concise and helpful answer to the user's question based on the provided context and history. Write in Markdown format. Use standard backticks (\`) for inline code.`
      });

      // Convert the Genkit stream to a ReadableStream
      return new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const text = chunk.text;
              if (text) {
                controller.enqueue(text);
              }
            }
            await response; // Wait for the full response to be processed
            controller.close();
          } catch (error) {
            console.error('❌ Stream error:', error);
            controller.error(error);
          }
        }
      });
    } catch (error) {
      console.error('❌ askQuestionStreamFlow error:', error);
      throw new Error(`Failed to get streaming answer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);
