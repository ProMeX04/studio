
/**
 * @fileOverview Quiz generation flow using Google Generative AI SDK.
 *
 * - generateQuiz - A function that generates a quiz for a given topic.
 */
import { GoogleGenerativeAI, GenerationConfig, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { z } from 'zod';
import { GenerateQuizInputSchema, GenerateQuizOutputContainerSchema, GenerateQuizOutput, GenerateQuizJsonSchema } from '@/ai/schemas';
import { AIOperationError } from '@/lib/ai-utils';

const GenerateQuizClientInputSchema = GenerateQuizInputSchema.extend({
    apiKey: z.string().optional(),
});
type GenerateQuizClientInput = z.infer<typeof GenerateQuizClientInputSchema>;

export async function generateQuiz(input: GenerateQuizClientInput): Promise<GenerateQuizOutput> {
  if (!input.apiKey) {
    throw new AIOperationError('API key is required.', 'API_KEY_REQUIRED');
  }

  const genAI = new GoogleGenerativeAI(input.apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

  const existingQuestionsPrompt = input.existingQuestions && input.existingQuestions.length > 0
    ? `
You have already generated the following questions. Do not repeat them or create questions with very similar content.

Existing Questions:
${input.existingQuestions.map(q => `- "${q.question}"`).join('\n')}
`
    : '';

  const promptText = `You are a quiz generator. Generate a ${input.count}-question multiple-choice quiz for the topic: ${input.topic} in the language: ${input.language}. Populate the "questions" array in the JSON object. Each question should have exactly 4 options, a single correct answer, and an explanation for the answer.

For the "options" array:
 - Each option must be plain text **without any leading labels** such as "A)", "B.", "C -", or similar. Simply provide the option content itself.

**Critically important**: The value for the "answer" field for each question object MUST be an exact, verbatim copy of one of the strings from the "options" array for that same question.

The content for "question", "options", and "explanation" fields MUST be valid standard Markdown.
- Use standard backticks (\`) for inline code blocks.
- Use triple backticks with a language identifier for multi-line code blocks.
- For mathematical notations, use standard LaTeX syntax: $...$ for inline math and $$...$$ for block-level math.
${existingQuestionsPrompt}
`;
  
  const generationConfig: GenerationConfig = {
    responseMimeType: "application/json",
    // @ts-ignore - responseSchema is a valid property
    responseSchema: GenerateQuizJsonSchema,
  };
  
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        generationConfig,
        safetySettings: [
            {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
        ]
      });

      const parsedJson = JSON.parse(result.response.text());
      const validatedOutput = GenerateQuizOutputContainerSchema.parse(parsedJson);

      // Additional validation for answer being in options
      for (const question of validatedOutput.questions) {
        if (!question.options.includes(question.answer)) {
          console.warn(`Attempt ${attempts}: AI generated an answer that is not in the options list. Retrying...`);
          throw new AIOperationError('AI generated an answer that is not in the options list.', 'AI_ANSWER_NOT_IN_OPTIONS', true); // Retryable error
        }
      }

      console.log(`✅ Generated ${validatedOutput.questions.length} valid quiz questions`);
      return validatedOutput.questions;

    } catch (error: any) {
      console.error(`❌ Quiz generation attempt ${attempts} failed:`, error);
      
      const isRetryableError = error instanceof AIOperationError && error.code === 'AI_ANSWER_NOT_IN_OPTIONS';

      if (isRetryableError && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait before retrying
      } else {
        if (error.message.includes('JSON')) {
            throw new AIOperationError('AI returned an invalid data format.', 'AI_INVALID_FORMAT');
        }
        if (error instanceof z.ZodError) {
            throw new AIOperationError('AI returned an invalid data format.', 'AI_INVALID_FORMAT');
        }
        if (error instanceof AIOperationError) throw error;
        throw new AIOperationError('Failed to generate quiz from AI.', 'AI_GENERATION_FAILED');
      }
    }
  }

  throw new AIOperationError('AI_GENERATION_FAILED_ALL_ATTEMPTS');
}
