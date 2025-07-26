
/**
 * @fileOverview Flow to explain a specific quiz answer option using Google Generative AI SDK.
 *
 * - explainQuizOption - A function that generates an explanation for a given quiz option.
 */

import { GoogleGenerativeAI, GenerationConfig, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { z } from 'zod';
import { ExplainQuizOptionInputSchema, ExplainQuizOptionOutput, ExplainQuizOptionOutputSchema, ExplainQuizOptionJsonSchema } from '@/ai/schemas';
import { AIOperationError } from '@/lib/ai-utils';

const ExplainQuizOptionClientInputSchema = ExplainQuizOptionInputSchema.extend({
    apiKey: z.string(), // API key is now required and passed directly
});
type ExplainQuizOptionClientInput = z.infer<typeof ExplainQuizOptionClientInputSchema>;

export async function explainQuizOption(input: ExplainQuizOptionClientInput): Promise<ExplainQuizOptionOutput> {
  const { apiKey, ...promptInput } = input;

  if (!apiKey) {
      throw new AIOperationError('API key is required.', 'API_KEY_REQUIRED');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
  
  const promptText = `You are a helpful quiz tutor.
${promptInput.selectedOption === promptInput.correctAnswer 
    ? `The user has chosen the CORRECT answer and wants a more detailed explanation.

Topic: ${promptInput.topic}
Question: "${promptInput.question}"
Correct Answer: "${promptInput.correctAnswer}"

Please provide a more in-depth explanation of why "${promptInput.selectedOption}" is the correct answer for the question "${promptInput.question}", in the language: ${promptInput.language}. You can provide additional context or interesting facts related to the topic. Populate the "explanation" field in the JSON output with this information.`
    : `The user has chosen an INCORRECT answer and wants to know why it's wrong.

Topic: ${promptInput.topic}
Question: "${promptInput.question}"
Correct Answer: "${promptInput.correctAnswer}"
The Incorrect Option to Explain: "${promptInput.selectedOption}"

Please explain specifically why "${promptInput.selectedOption}" is not the correct answer for the question "${promptInput.question}", in the language: ${promptInput.language}. Populate the "explanation" field in the JSON output with this information.`
}

The "explanation" field must be valid standard Markdown:
- Use backticks (\`) for inline code.
- Use triple backticks (\`\`\`) for code blocks.
- Use standard LaTeX syntax for math ($...$ or $$...$$).`;

  const generationConfig: GenerationConfig = {
    responseMimeType: "application/json",
    // @ts-ignore - responseSchema is a valid property
    responseSchema: ExplainQuizOptionJsonSchema,
  };

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
    const validatedOutput = ExplainQuizOptionOutputSchema.parse(parsedJson);

    return validatedOutput;

  } catch (error: any) {
    console.error('❌ AI Explanation Error:', error);
    if (error.message.includes('JSON')) {
        throw new AIOperationError('AI returned an invalid data format.', 'AI_INVALID_FORMAT');
    }
    if (error instanceof z.ZodError) {
      throw new AIOperationError('AI returned an invalid data format.', 'AI_INVALID_FORMAT');
    }
    throw new AIOperationError('Failed to generate explanation from AI.', 'AI_GENERATION_FAILED');
  }
}
