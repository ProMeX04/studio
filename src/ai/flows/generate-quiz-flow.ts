
'use server';
/**
 * @fileOverview Genkit flow to generate quiz questions based on theory content.
 */

import { ai } from '@/lib/genkit-service';
import { z } from 'zod';
import { GenerateQuizOutputContainerSchema, GenerateQuizOutputSchema } from '@/ai/schemas';

const GenerateQuizInputSchema = z.object({
  topic: z.string().describe('The main topic of the course.'),
  language: z.string().describe('The language for the quiz.'),
  theoryContent: z.string().describe('The full theory content to base the quiz on.'),
  count: z.number().optional().default(10).describe('The desired number of quiz questions.'),
});

export async function generateQuiz(input: z.infer<typeof GenerateQuizInputSchema>): Promise<z.infer<typeof GenerateQuizOutputSchema>> {
  const prompt = ai.definePrompt({
    name: 'generateQuizPrompt',
    input: { schema: GenerateQuizInputSchema },
    output: { schema: GenerateQuizOutputContainerSchema },
    prompt: `
      You are an expert in educational assessment. Based on the provided theory content about "{{topic}}", generate a set of {{count}} multiple-choice quiz questions.

      The quiz must be in {{language}}.

      Each question must have:
      - A clear question text.
      - 4 plausible options.
      - A single correct answer.
      - A brief but clear explanation for why the correct answer is right.

      **Theory Content:**
      ---
      {{{theoryContent}}}
      ---

      Generate exactly {{count}} quiz questions.
    `,
  });

  const { output } = await prompt(input);
  return output?.questions ?? [];
}
