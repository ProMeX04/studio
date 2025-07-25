
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
    // Output is a stream, so no schema here
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

Please provide a concise and helpful answer to the user's question based on the provided context and history. After the answer, provide two relevant follow-up questions the user might have. These suggestions should help the user explore the topic further.

IMPORTANT: Your response MUST be a valid JSON object with the keys "answer" and "suggestions". The "answer" and "suggestions" fields must contain valid Markdown. Use standard backticks (\`) for inline code.
`,
      });

      // Convert the Genkit stream to a ReadableStream of text chunks
      const readableStream = new ReadableStream({
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
            console.error('❌ Stream error inside ReadableStream:', error);
            controller.error(error);
          }
        }
      });

      return readableStream;

    } catch (error) {
      console.error('❌ askQuestionStreamFlow error:', error);
      // In case of an error, return a stream that emits an error message
      return new ReadableStream({
        start(controller) {
          const errorResponse = {
            answer: "Xin lỗi, đã có lỗi xảy ra. Tôi không thể trả lời câu hỏi của bạn lúc này.",
            suggestions: []
          };
          controller.enqueue(JSON.stringify(errorResponse));
          controller.close();
        }
      });
    }
  }
);
