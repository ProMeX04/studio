
/**
 * @fileOverview Flow to generate content for a specific chapter of a theory document.
 */

import { z } from 'zod';
import { GenerationConfig, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { GenerateTheoryChapterInputSchema, GenerateTheoryChapterOutputSchema, GenerateTheoryChapterOutput } from '@/ai/schemas';
import { performAIOperation } from '@/lib/ai-service';

const ClientInputSchema = GenerateTheoryChapterInputSchema.extend({
    apiKeys: z.array(z.string()),
    apiKeyIndex: z.number(),
});
type ClientInput = z.infer<typeof ClientInputSchema>;

export async function generateTheoryChapter(
  input: ClientInput
): Promise<{ result: GenerateTheoryChapterOutput; newApiKeyIndex: number }> {
  const { apiKeys, apiKeyIndex, model: modelName, ...promptInput } = input;
  
  return performAIOperation({
    apiKeys,
    apiKeyIndex,
    operation: async (genAI) => {
        const model = genAI.getGenerativeModel({ model: modelName });

        const promptText = `You are a professional educator and expert on the given topic. Your task is to write a detailed, well-structured, and in-depth chapter for a larger document.

Overall Topic: "${promptInput.topic}"
Current Chapter to Write: "${promptInput.chapterTitle}"
Language: ${promptInput.language}

Please write the content for this specific chapter. Explain the concepts thoroughly. Use clear headings (starting from h2 or h3), subheadings, bullet points, tables, and code examples where appropriate to structure the information logically.

The entire output must be a single, valid Markdown string.

The Markdown content MUST be valid standard Markdown.
- Use '##' or '###' for headings.
- Use standard backticks (\`) for inline code blocks.
- Use triple backticks with a language identifier for multi-line code blocks (e.g., \`\`\`javascript).
- For mathematical notations, use standard LaTeX syntax: $...$ for inline math and $$...$$ for block-level math.
- CRITICAL: Do NOT wrap the entire response in a markdown code block (\`\`\`...\`\`\`). The response should be raw markdown text.`;

        const generationConfig: GenerationConfig = {
          responseMimeType: "text/plain",
        };

        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: promptText }] }],
          generationConfig,
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          ]
        });
        
        const parsedJson = { content: result.response.text() };
        return GenerateTheoryChapterOutputSchema.parse(parsedJson);
    }
  });
}
