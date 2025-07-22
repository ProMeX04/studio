'use server';

/**
 * @fileOverview Quiz generation flow for a given topic.
 *
 * - generateQuiz - A function that generates a quiz for a given topic.
 * - GenerateQuizInput - The input type for the generateQuiz function.
 * - GenerateQuizOutput - The return type for the generateQuiz function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateQuizInputSchema = z.object({
  topic: z.string().describe('The topic for which to generate a quiz.'),
  count: z.number().describe('The number of questions to generate.'),
  language: z.string().describe('The language for the quiz.'),
});

export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

const QuizQuestionSchema = z.object({
    question: z.string().describe('The question text.'),
    options: z.array(z.string()).describe('A list of possible answers.'),
    answer: z.string().describe('The correct answer.'),
    explanation: z.string().describe('A brief explanation for the correct answer.'),
});

const GenerateQuizOutputSchema = z.array(QuizQuestionSchema);

export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;

export async function generateQuiz(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  return generateQuizFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateQuizPrompt',
  input: {schema: GenerateQuizInputSchema},
  output: {schema: GenerateQuizOutputSchema},
  prompt: `You are a quiz generator. Generate a {{{count}}}-question multiple-choice quiz for the topic: {{{topic}}} in the language: {{{language}}}. Each question should have 4 options, a single correct answer, and an explanation for the answer.

Return a JSON array of objects with "question", "options", "answer", and "explanation" keys.

For example:
[
    {
        "question": "What is the powerhouse of the cell?",
        "options": ["Nucleus", "Ribosome", "Mitochondrion", "Endoplasmic Reticulum"],
        "answer": "Mitochondrion",
        "explanation": "The mitochondrion is known as the powerhouse of the cell because it generates most of the cell's supply of adenosine triphosphate (ATP), used as a source of chemical energy."
    },
    {
        "question": "What is the capital of Japan?",
        "options": ["Beijing", "Seoul", "Tokyo", "Bangkok"],
        "answer": "Tokyo",
        "explanation": "Tokyo is the capital and largest city of Japan. It is located on the eastern coast of the main island Honshu."
    }
]`,
});

const generateQuizFlow = ai.defineFlow(
  {
    name: 'generateQuizFlow',
    inputSchema: GenerateQuizInputSchema,
    outputSchema: GenerateQuizOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
