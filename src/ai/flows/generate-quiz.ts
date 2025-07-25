/**
 * @fileOverview Quiz generation flow for a given topic.
 *
 * - generateQuiz - A function that generates a quiz for a given topic.
 */
import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { GenerateQuizInputSchema, GenerateQuizOutputSchema, GenerateQuizInput, GenerateQuizOutput } from '@/ai/schemas';
import { AIOperationError } from '@/lib/ai-utils';

const GenerateQuizClientInputSchema = GenerateQuizInputSchema.extend({
    apiKey: z.string().optional(),
});
type GenerateQuizClientInput = z.infer<typeof GenerateQuizClientInputSchema>;

export async function generateQuiz(input: GenerateQuizClientInput): Promise<GenerateQuizOutput> {
  if (!input.apiKey) {
    throw new AIOperationError('API key is required.', 'API_KEY_REQUIRED');
  }

  const ai = genkit({
    plugins: [googleAI({ apiKey: input.apiKey })],
  });

  const prompt = ai.definePrompt({
    name: 'generateQuizPrompt',
    input: { schema: GenerateQuizInputSchema },
    output: { schema: GenerateQuizOutputSchema },
    prompt: `You are a quiz generator. Generate a {{{count}}}-question multiple-choice quiz for the topic: {{{topic}}} in the language: {{{language}}}. Each question should have exactly 4 options, a single correct answer, and an explanation for the answer.

For the "options" array:
 - Each option must be plain text **without any leading labels** such as "A)", "B.", "C -", or similar. Simply provide the option content itself.

Example valid options array: ["Paris", "London", "Rome", "Berlin"]

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
  
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const { output } = await prompt(input);

      if (!output) {
        throw new Error('AI_EMPTY_RESPONSE');
      }

      if (!Array.isArray(output)) {
        throw new Error('AI_INVALID_FORMAT');
      }

      let allValid = true;
      for (const question of output) {
        if (!question.question || !question.options || !question.answer || !question.explanation) {
          allValid = false;
          throw new Error('AI_INVALID_QUESTION');
        }

        if (!Array.isArray(question.options) || question.options.length !== 4) {
          allValid = false;
          throw new Error('AI_INVALID_OPTIONS');
        }

        if (!question.options.includes(question.answer)) {
          allValid = false;
          console.warn(`Attempt ${attempts}: AI generated an answer that is not in the options list. Retrying...`);
          throw new Error('AI_ANSWER_NOT_IN_OPTIONS');
        }
      }

      if (allValid) {
        console.log(`✅ Generated ${output.length} valid quiz questions`);
        return output;
      }

    } catch (error: any) {
      console.error(`❌ Quiz generation attempt ${attempts} failed:`, error.message);
      
      if (attempts >= maxAttempts || error.message !== 'AI_ANSWER_NOT_IN_OPTIONS') {
        if (error.message.startsWith('AI_')) {
          throw error;
        }
        throw new Error('AI_GENERATION_FAILED');
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  throw new Error('AI_GENERATION_FAILED_ALL_ATTEMPTS');
}
