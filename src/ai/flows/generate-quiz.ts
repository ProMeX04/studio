
'use server';

/**
 * @fileOverview Quiz generation flow for a given topic.
 *
 * - generateQuiz - A function that generates a quiz for a given topic.
 */

import {ai} from '@/ai/genkit';
import { GenerateQuizInputSchema, GenerateQuizOutputSchema, GenerateQuizInput, GenerateQuizOutput } from '@/ai/schemas';

export async function generateQuiz(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  return generateQuizFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateQuizPrompt',
  input: {schema: GenerateQuizInputSchema},
  output: {schema: GenerateQuizOutputSchema},
  prompt: `You are a quiz generator. Generate a {{{count}}}-question multiple-choice quiz for the topic: {{{topic}}} in the language: {{{language}}}. Each question should have 4 options, a single correct answer, and an explanation for the answer.

{{#if existingQuestions}}
You have already generated the following questions. Do not repeat them or create questions with very similar content.

Existing Questions:
{{#each existingQuestions}}
- "{{{this.question}}}"
{{/each}}
{{/if}}

IMPORTANT: Your response MUST be a valid JSON array of objects. Each object must have "question", "options", "answer", and "explanation" keys.
The content for "question", "options", and "explanation" fields MUST be valid standard Markdown.
- Use standard backticks (\`) for inline code blocks (e.g., \`my_variable\`).
- Use triple backticks with a language identifier for multi-line code blocks (e.g., \`\`\`python... \`\`\`).
- For mathematical notations, use standard LaTeX syntax: $...$ for inline math and $$...$$ for block-level math.
Ensure explanations are well-structured with clear paragraphs.
`,
});

const generateQuizFlow = ai.defineFlow(
  {
    name: 'generateQuizFlow',
    inputSchema: GenerateQuizInputSchema,
    outputSchema: GenerateQuizOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('AI failed to generate quiz questions.');
    }

    return output;
  }
);
