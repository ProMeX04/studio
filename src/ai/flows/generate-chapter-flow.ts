
'use server';
/**
 * @fileOverview Genkit flow to generate detailed content for a specific chapter.
 */

import { ai } from '@/lib/genkit-service';
import { z } from 'zod';

const GenerateChapterInputSchema = z.object({
  topic: z.string().describe('The main topic of the entire course.'),
  chapterTitle: z.string().describe('The title of the specific chapter to generate content for.'),
  language: z.string().describe('The language for the content.'),
  knowledgeLevel: z.string().describe("User's knowledge level (beginner, intermediate, advanced)."),
  learningStyle: z.string().describe("User's learning style (reading, visual, auditory, kinesthetic)."),
  tone: z.string().describe("Desired tone for the content (formal, casual)."),
});

const GenerateChapterOutputSchema = z.string().describe('The generated content for the chapter in Markdown format.');

export async function generateChapter(input: z.infer<typeof GenerateChapterInputSchema>): Promise<string> {
  const prompt = ai.definePrompt({
    name: 'generateChapterPrompt',
    input: { schema: GenerateChapterInputSchema },
    output: { schema: GenerateChapterOutputSchema },
    prompt: `
      You are an expert educator and content creator. Your task is to write a detailed, comprehensive, and engaging chapter for an online course on the topic of "{{topic}}".

      The specific chapter you need to write is: "{{chapterTitle}}".

      The target audience's knowledge level is: {{knowledgeLevel}}.
      Their preferred learning style is: {{learningStyle}}.
      The desired tone of voice is: {{tone}}.
      The content must be in {{language}}.

      **Instructions:**
      1.  **Content:** Write a detailed and well-structured chapter on "{{chapterTitle}}". Break down complex concepts into easy-to-understand explanations. Use examples, analogies, and step-by-step instructions where appropriate.
      2.  **Learning Style Adaptation:**
          *   If the style is 'visual', include descriptions of diagrams, charts, or mind maps using Markdown (e.g., Mermaid syntax for diagrams).
          *   If the style is 'kinesthetic', include practical examples, code snippets (if applicable), or small exercises.
          *   If the style is 'auditory', structure the text in a way that would be easy to read aloud, like a podcast script.
          *   If the style is 'reading', focus on rich, detailed text with clear headings and paragraphs.
      3.  **Format:** The entire output must be a single string in Markdown format. Use headings, lists, bold text, italics, and code blocks to structure the content effectively.
      4.  **Language:** Ensure the entire output is in {{language}}.
    `,
  });

  const { output } = await prompt(input);
  return output ?? '';
}
