'use server';

/**
 * @fileOverview Streaming flow to explain a specific quiz answer option.
 */

import {ai} from '@/ai/genkit';
import { ExplainQuizOptionInputSchema, type ExplainQuizOptionInput } from '@/ai/schemas';

export async function explainQuizOptionStream(input: ExplainQuizOptionInput): Promise<ReadableStream<string>> {
  return explainQuizOptionStreamFlow(input);
}

const streamExplanationPrompt = ai.definePrompt({
  name: 'streamExplanationPrompt',
  input: {schema: ExplainQuizOptionInputSchema},
  prompt: `You are a helpful quiz tutor. The user has chosen an INCORRECT answer and wants to know why it's wrong.

**Quiz Details:**
- Topic: {{{topic}}}
- Question: "{{{question}}}"
- Correct Answer: "{{{correctAnswer}}}"
- The Incorrect Option to Explain: "{{{selectedOption}}}"
- Output Language: {{{language}}}

Please provide a more in-depth explanation of why "{{{selectedOption}}}" is the correct answer for the question "{{{question}}}". You can provide additional context or interesting facts related to the topic.


**IMPORTANT: Write your explanation in {{{language}}} language.**

**If the user's choice is CORRECT:**
- Explain why "{{{selectedOption}}}" is the right answer
- Provide additional context or details about the concept
- Give examples or related information to deepen understanding

**If the user's choice is INCORRECT:**
- Explain specifically why "{{{selectedOption}}}" is not correct
- Clearly explain why "{{{correctAnswer}}}" is the right answer instead
- Help the user understand the key concept or rule

Write a focused, educational explanation in Markdown format. Use backticks for code and LaTeX syntax ($...$) for math when needed.`,
});

const explainQuizOptionStreamFlow = ai.defineFlow(
  {
    name: 'explainQuizOptionStreamFlow',
    inputSchema: ExplainQuizOptionInputSchema,
  },
  async (input) => {
    try {
      const promptResponse = await streamExplanationPrompt(input);
      
      const {stream} = await ai.generateStream({
        model: 'googleai/gemini-2.5-flash-lite',
        prompt: promptResponse.text || '',
      });

      // Convert the Genkit stream to a ReadableStream
      return new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              if (chunk.text) {
                controller.enqueue(chunk.text);
              }
            }
            controller.close();
          } catch (error) {
            console.error('❌ Stream error:', error);
            controller.error(error);
          }
        }
      });
    } catch (error) {
      console.error('❌ explainQuizOptionStreamFlow error:', error);
      throw new Error(`Failed to get streaming explanation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);
