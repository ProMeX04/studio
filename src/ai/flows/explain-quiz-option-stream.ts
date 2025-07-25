
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
  prompt: `You are a helpful AI tutor. Your task is to explain a chosen answer for a quiz question.

Here is the quiz information:
- Topic: {{{topic}}}
- Question: "{{{question}}}"
- Correct Answer: "{{{correctAnswer}}}"
- The user's selected answer (which you need to explain): "{{{selectedOption}}}"

Your instructions:
1.  Analyze whether the user's selected answer ("{{{selectedOption}}}") is correct or incorrect by comparing it to the "Correct Answer".
2.  Provide a clear, in-depth explanation based on this analysis.
    -   If the user's choice is CORRECT: Confirm it's the right answer and explain the underlying concepts in detail. Provide extra context or interesting facts.
    -   If the user's choice is INCORRECT: Clearly state that it's wrong, explain *why* it's wrong, and then thoroughly explain why the "Correct Answer" is the right one.
3.  The entire response MUST be in the following language: {{{language}}}.
4.  Format your entire response using standard Markdown. Use backticks for code and LaTeX syntax ($...$) for math when needed.
`,
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
