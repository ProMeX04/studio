
'use server';
/**
 * @fileOverview Genkit flow to generate a course outline.
 */

import { ai } from '@/lib/genkit-service';
import { z } from 'zod';

const GenerateOutlineInputSchema = z.object({
  topic: z.string().describe('The topic for which to generate an outline.'),
  language: z.string().describe('The language for the outline.'),
  knowledgeLevel: z.string().describe("User's knowledge level (beginner, intermediate, advanced)."),
  learningGoal: z.string().describe("User's primary goal (overview, deep_dive, practical)."),
});

const GenerateOutlineOutputSchema = z.object({
    outline: z.array(z.string()).describe("An array of chapter titles for the course outline."),
});

export async function generateOutline(input: z.infer<typeof GenerateOutlineInputSchema>): Promise<string[]> {
  const prompt = ai.definePrompt({
    name: 'generateOutlinePrompt',
    input: { schema: GenerateOutlineInputSchema },
    output: { schema: GenerateOutlineOutputSchema },
    prompt: `
      You are an expert curriculum designer. Create a logical and comprehensive course outline for the topic: "{{topic}}".

      The course should be tailored for a learner with a knowledge level of "{{knowledgeLevel}}" and whose main goal is "{{learningGoal}}".
      The outline must be in {{language}}.

      Provide a list of 5 to 8 chapter titles that break down the topic from basic to advanced concepts. The titles should be concise and clearly represent the content of each chapter.
    `,
  });

  const { output } = await prompt(input);
  return output?.outline ?? [];
}
