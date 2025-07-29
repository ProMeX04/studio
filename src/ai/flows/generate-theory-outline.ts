
/**
 * @fileOverview Flow to generate a structured outline for a theory document.
 */

import { z } from 'zod';
import { GenerationConfig, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { GenerateTheoryOutlineInputSchema, GenerateTheoryOutlineOutputSchema, GenerateTheoryOutlineOutput } from '@/ai/schemas';
import { performAIOperation } from '@/lib/ai-service';

const ClientInputSchema = GenerateTheoryOutlineInputSchema.extend({
    apiKeys: z.array(z.string()),
    apiKeyIndex: z.number(),
});
type ClientInput = z.infer<typeof ClientInputSchema>;

export async function generateTheoryOutline(
  input: ClientInput
): Promise<{ result: GenerateTheoryOutlineOutput; newApiKeyIndex: number }> {
  const { apiKeys, apiKeyIndex, model: modelName, ...promptInput } = input;
  
  return performAIOperation({
    apiKeys,
    apiKeyIndex,
    operation: async (genAI) => {
        const model = genAI.getGenerativeModel({ model: modelName });

        const promptText = `You are a professional educator. Your task is to generate a comprehensive learning outline for the topic: "${promptInput.topic}" in the language: ${promptInput.language}.

The outline should be structured logically to facilitate learning, starting from a high-level overview and progressively diving into details.

The structure should follow this pattern:
1.  Start with "Tại sao cần học chủ đề này?".
2.  Include a "Lịch sử và Bối cảnh" chapter if relevant.
3.  List the core concepts as separate chapter titles.
4.  Include chapters on practical applications or advanced topics if applicable.
5.  End with a "Tổng kết" or "Tóm tắt" chapter.

Generate between 5 and 10 chapter titles. Each title must be on a new line. Do not include numbers or bullet points.`;

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
        
        const outlineArray = result.response.text().split('\n').filter(line => line.trim() !== '');
        const parsedJson = { outline: outlineArray };
        return GenerateTheoryOutlineOutputSchema.parse(parsedJson);
    }
  });
}
