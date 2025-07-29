
'use server';

/**
 * @fileOverview Flow to generate a podcast script from theory content.
 */

import { z } from 'zod';
import { GenerationConfig, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { GeneratePodcastScriptInputSchema, GeneratePodcastScriptOutputSchema, GeneratePodcastScriptOutput } from '@/ai/schemas';
import { performAIOperation } from '@/lib/ai-service';

const ClientInputSchema = GeneratePodcastScriptInputSchema.extend({
    apiKeys: z.array(z.string()),
    apiKeyIndex: z.number(),
});
type ClientInput = z.infer<typeof ClientInputSchema>;

export async function generatePodcastScript(
  input: ClientInput
): Promise<{ result: GeneratePodcastScriptOutput; newApiKeyIndex: number }> {
  const { apiKeys, apiKeyIndex, model: modelName, ...promptInput } = input;
  
  return performAIOperation({
    apiKeys,
    apiKeyIndex,
    operation: async (genAI) => {
        const model = genAI.getGenerativeModel({ model: modelName });

        const promptText = `Bạn là một nhà biên kịch podcast chuyên nghiệp. Nhiệm vụ của bạn là chuyển đổi nội dung lý thuyết khô khan sau đây thành một kịch bản podcast hấp dẫn, có cấu trúc như một cuộc hội thoại giữa "Người dẫn chương trình" và một "Chuyên gia".

Chủ đề chính: "${promptInput.topic}"
Chương hiện tại: "${promptInput.chapterTitle}"
Ngôn ngữ: ${promptInput.language}

Nội dung lý thuyết cần chuyển đổi:
---
${promptInput.theoryContent}
---

Yêu cầu kịch bản:
1.  Bắt đầu bằng lời chào của "Người dẫn chương trình".
2.  "Người dẫn chương trình" sẽ đặt câu hỏi, dẫn dắt câu chuyện.
3.  "Chuyên gia" sẽ trả lời, giải thích các khái niệm dựa trên nội dung lý thuyết đã cho.
4.  Kịch bản phải tuân thủ định dạng nghiêm ngặt sau, mỗi lời thoại trên một dòng:
    Người dẫn chương trình: [Lời thoại]
    Chuyên gia: [Lời thoại]
5.  Giữ cho cuộc hội thoại tự nhiên, dễ hiểu và thú vị.
6.  Kết thúc bằng lời chào tạm biệt của "Người dẫn chương trình".
7.  Toàn bộ đầu ra phải là một chuỗi văn bản duy nhất chứa kịch bản.`;

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
        
        const parsedJson = { script: result.response.text() };
        return GeneratePodcastScriptOutputSchema.parse(parsedJson);
    }
  });
}
