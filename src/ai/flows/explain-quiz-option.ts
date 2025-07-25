/**
 * @fileOverview Flow to explain a specific quiz answer option using Google Generative AI SDK.
 *
 * - explainQuizOption - A function that generates an explanation for a given quiz option.
 */

import { GoogleGenerativeAI, GenerationConfig, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { z } from 'zod';
import { ExplainQuizOptionInputSchema, ExplainQuizOptionOutput, ExplainQuizOptionOutputSchema } from '@/ai/schemas';
import { AIOperationError } from '@/lib/ai-utils';

const ExplainQuizOptionClientInputSchema = ExplainQuizOptionInputSchema.extend({
    apiKey: z.string().optional(),
});
type ExplainQuizOptionClientInput = z.infer<typeof ExplainQuizOptionClientInputSchema>;

export async function explainQuizOption(input: ExplainQuizOptionClientInput): Promise<ExplainQuizOptionOutput> {
  if (!input.apiKey) {
      throw new AIOperationError('API key is required.', 'API_KEY_REQUIRED');
  }

  const genAI = new GoogleGenerativeAI(input.apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

  const explanationOnlySchema = ExplainQuizOptionOutputSchema.pick({ explanation: true });
  
  const promptText = `You are a helpful quiz tutor. Your response MUST be a JSON object that adheres to the following Zod schema:
${JSON.stringify(explanationOnlySchema.json())}

${input.selectedOption === input.correctAnswer 
    ? `The user has chosen the CORRECT answer and wants a more detailed explanation.

Topic: ${input.topic}
Question: "${input.question}"
Correct Answer: "${input.correctAnswer}"

Please provide a more in-depth explanation of why "${input.selectedOption}" is the correct answer for the question "${input.question}", in the language: ${input.language}. You can provide additional context or interesting facts related to the topic. Populate the "explanation" field in the JSON output with this information.

Use standard Markdown for formatting:
- Use backticks (\`) for inline code.
- Use triple backticks (\`\`\`) for code blocks.
- Use bolding for keywords.
- Use standard LaTeX syntax for math ($...$ or $$...$$).`
    : `The user has chosen an INCORRECT answer and wants to know why it's wrong.

Topic: ${input.topic}
Question: "${input.question}"
Correct Answer: "${input.correctAnswer}"
The Incorrect Option to Explain: "${input.selectedOption}"

Please explain specifically why "${input.selectedOption}" is not the correct answer for the question "${input.question}", in the language: ${input.language}. Populate the "explanation" field in the JSON output with this information.

Use standard Markdown for formatting:
- Use backticks (\`) for inline code.
- Use triple backticks (\`\`\`) for code blocks.
- Use bolding for keywords.
- Use standard LaTeX syntax for math ($...$ or $$...$$).`
}`;

  const generationConfig: GenerationConfig = {
    responseMimeType: "application/json",
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
    
    const responseText = result.response.text();
    // When using responseMimeType: "application/json", the SDK already parses the JSON.
    const validatedOutput = explanationOnlySchema.parse(JSON.parse(responseText));

    return {
        explanation: validatedOutput.explanation,
    };

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
