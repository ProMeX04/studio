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
  
  const promptText = input.selectedOption === input.correctAnswer 
    ? `You are a helpful quiz tutor. The user has chosen the CORRECT answer and wants a more detailed explanation.

Topic: ${input.topic}
Question: "${input.question}"
Correct Answer: "${input.correctAnswer}"

Please provide a more in-depth explanation of why "${input.selectedOption}" is the correct answer for the question "${input.question}", in the language: ${input.language}. You can provide additional context or interesting facts related to the topic.

IMPORTANT: Your response MUST be a valid JSON object with a single key "explanation". The "explanation" field must contain valid standard Markdown.
- Use standard backticks (\`) for inline code blocks (e.g., \`my_variable\`).
- Use triple backticks with a language identifier for multi-line code blocks (e.g., \`\`\`python... \`\`\`).
- For mathematical notations, use standard LaTeX syntax: $...$ for inline math and $$...$$ for block-level math.
- For example: {"explanation": "The method \`pop()\` removes and returns the element at the given index. In this case, it removes the element at index 1, which is **20**."}
Ensure the explanation is well-structured with clear paragraphs.
`
    : `You are a helpful quiz tutor. The user has chosen an INCORRECT answer and wants to know why it's wrong.

Topic: ${input.topic}
Question: "${input.question}"
Correct Answer: "${input.correctAnswer}"
The Incorrect Option to Explain: "${input.selectedOption}"

Please explain specifically why "${input.selectedOption}" is not the correct answer for the question "${input.question}", in the language: ${input.language}.

IMPORTANT: Your response MUST be a valid JSON object with a single key "explanation". The "explanation" field must contain valid standard Markdown.
- Use standard backticks (\`) for inline code blocks (e.g., \`my_variable\`).
- Use triple backticks with a language identifier for multi-line code blocks (e.g., \`\`\`python... \`\`\`).
- For mathematical notations, use standard LaTeX syntax: $...$ for inline math and $$...$$ for block-level math.
- For example: {"explanation": "While that's a good thought, the correct answer is actually **20**. The method \`pop(1)\` specifically targets the element at index 1."}
Ensure the explanation is well-structured with clear paragraphs.
`;

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
    const parsedJson = JSON.parse(responseText);
    const validatedOutput = explanationOnlySchema.parse(parsedJson);

    return {
        explanation: validatedOutput.explanation,
    };

  } catch (error: any) {
    console.error('❌ AI Explanation Error:', error);
    if (error instanceof z.ZodError) {
      throw new AIOperationError('AI returned an invalid data format.', 'AI_INVALID_FORMAT');
    }
    throw new AIOperationError('Failed to generate explanation from AI.', 'AI_GENERATION_FAILED');
  }
}
