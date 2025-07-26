
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
    apiKeys: z.array(z.string()),
    apiKeyIndex: z.number(),
});
type GenerateQuizClientInput = z.infer<typeof GenerateQuizClientInputSchema>;

export async function generateQuiz(
  input: GenerateQuizClientInput
): Promise<{ result: GenerateQuizOutput; newApiKeyIndex: number }> {
  const { apiKeys, apiKeyIndex, ...promptInput } = input;

  if (!apiKeys || apiKeys.length === 0) {
    throw new AIOperationError('API key is required.', 'API_KEY_REQUIRED');
  }

  let currentKeyIndex = apiKeyIndex;
  const maxAttempts = apiKeys.length;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const apiKey = apiKeys[currentKeyIndex];
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

      const existingQuestionsPrompt = promptInput.existingQuestions && promptInput.existingQuestions.length > 0
        ? `
      You have already generated the following questions. Do not repeat them or create questions with very similar content.

      Existing Questions:
      ${promptInput.existingQuestions.map(q => `- "${q.question}"`).join('\n')}
      `
        : '';

      const promptText = `You are a quiz generator. Generate a ${promptInput.count}-question multiple-choice quiz for the topic: ${promptInput.topic} in the language: ${promptInput.language}. Populate the "questions" array in the JSON object. Each question should have between 2 and 4 options, a single correct answer, and an explanation for the answer.

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

      const validQuestions = validatedOutput.questions.filter(question => {
        const isValid = question.options.includes(question.answer);
        if (!isValid) {
          console.warn('AI generated an invalid question (answer not in options), filtering it out:', question);
        }
        return isValid;
      });

      console.log(`✅ Generated ${validQuestions.length} valid quiz questions (filtered from ${validatedOutput.questions.length}).`);
      return { result: validQuestions, newApiKeyIndex: currentKeyIndex };

    } catch (error: any) {
        const isQuotaError = error.message?.includes('quota');
        console.warn(`API Key at index ${currentKeyIndex} failed.`, error.message);
        
        if (isQuotaError && attempt < maxAttempts - 1) {
            currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
            console.log(`Quota error. Trying next API Key at index ${currentKeyIndex}.`);
        } else {
            console.error(`❌ Quiz generation attempt ${attempt + 1} failed:`, error);
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

  throw new AIOperationError('All API keys failed due to quota or other issues.', 'ALL_KEYS_FAILED');
}
