
/**
 * @fileOverview Theory generation flow using Google Generative AI SDK.
 *
 * - generateTheory - A function that generates a theory document for a given topic.
 */

import { GoogleGenerativeAI, GenerationConfig, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { z } from 'zod';
import { GenerateTheoryInputSchema, GenerateTheoryOutput, GenerateTheoryOutputContainerSchema, GenerateTheoryJsonSchema } from '@/ai/schemas';
import { AIOperationError } from '@/lib/ai-utils';

const GenerateTheoryClientInputSchema = GenerateTheoryInputSchema.extend({
    apiKeys: z.array(z.string()),
    apiKeyIndex: z.number(),
});
type GenerateTheoryClientInput = z.infer<typeof GenerateTheoryClientInputSchema>;

export async function generateTheory(
  input: GenerateTheoryClientInput
): Promise<{ result: GenerateTheoryOutput; newApiKeyIndex: number }> {
  const { apiKeys, apiKeyIndex, ...promptInput } = input;
  
  if (!apiKeys || apiKeys.length === 0) {
    throw new AIOperationError('API key is required.', 'API_KEY_REQUIRED');
  }

  let currentKeyIndex = apiKeyIndex;

  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[currentKeyIndex];

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

      const promptText = `You are a professional educator and expert on the given topic. Your task is to generate a comprehensive, well-structured, and in-depth theoretical document about the topic: "${promptInput.topic}" in the language: ${promptInput.language}.

The document must be structured in a specific, logical order to facilitate learning, starting from a high-level overview and progressively diving into details. Please strictly adhere to the following structure:

1.  **Overview**: Start with a concise introduction to the topic.
2.  **History and Context**: Briefly discuss the history and context of the topic's development.
3.  **Learning Outline**: Provide a clear, bulleted or numbered list of the key concepts and sections that will be covered in detail.
4.  **Detailed Chapters**: For each item in the Learning Outline, create a detailed section (using H2 or H3 markdown headings). Explain the concepts thoroughly. Use clear headings, subheadings, bullet points, tables, and code examples where appropriate.

The entire output must be a single, valid Markdown string. Populate the "theory" field in the JSON object with this Markdown string.

The Markdown content in the "theory" field MUST be valid standard Markdown.
- Use '#' for headings (e.g., # Main Title, ## Sub-title).
- Use standard backticks (\`) for inline code blocks.
- Use triple backticks with a language identifier for multi-line code blocks (e.g., \`\`\`javascript).
- For mathematical notations, use standard LaTeX syntax: $...$ for inline math and $$...$$ for block-level math.
`;

      const generationConfig: GenerationConfig = {
        responseMimeType: "application/json",
        // @ts-ignore - responseSchema is a valid property
        responseSchema: GenerateTheoryJsonSchema,
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
      const validatedOutput = GenerateTheoryOutputContainerSchema.parse(parsedJson);

      console.log(`✅ Generated theory document`);
      return { result: validatedOutput, newApiKeyIndex: currentKeyIndex };

    } catch (error: any) {
        const isQuotaError = error.message?.includes('quota');
        console.warn(`API Key at index ${currentKeyIndex} failed.`, error.message);
        
        if (isQuotaError && i < apiKeys.length - 1) {
            currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
            console.log(`Quota error. Trying next API Key at index ${currentKeyIndex}.`);
        } else {
            console.error('❌ Theory generation error:', error);
            if (error.message.includes('JSON')) {
                throw new AIOperationError('AI returned an invalid data format.', 'AI_INVALID_FORMAT');
            }
            if (error instanceof z.ZodError) {
              throw new AIOperationError('AI returned an invalid data format.', 'AI_INVALID_FORMAT');
            }
            throw new AIOperationError('Failed to generate theory from AI.', 'AI_GENERATION_FAILED');
        }
    }
  }

  // If all keys failed
  throw new AIOperationError('All API keys failed due to quota or other issues.', 'ALL_KEYS_FAILED');
}
