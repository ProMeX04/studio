
'use server';

/**
 * @fileOverview Flow to generate audio from a podcast script using Google Generative AI SDK.
 * This flow specifically uses a multi-speaker setup for a conversational feel.
 */

import { GoogleGenerativeAI, GenerationConfig, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { z } from 'zod';
import { GenerateAudioInputSchema, GenerateAudioOutputSchema, GenerateAudioOutput } from '@/ai/schemas';
import { AIOperationError } from '@/lib/ai-utils';
import wav from 'wav';

const ClientInputSchema = GenerateAudioInputSchema.extend({
    apiKeys: z.array(z.string()),
    apiKeyIndex: z.number(),
});
type ClientInput = z.infer<typeof ClientInputSchema>;

async function toWav(
    pcmData: Buffer,
    channels = 1,
    rate = 24000,
    sampleWidth = 2
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const writer = new wav.Writer({
        channels,
        sampleRate: rate,
        bitDepth: sampleWidth * 8,
      });
  
      const bufs: Buffer[] = [];
      writer.on('error', reject);
      writer.on('data', (d) => bufs.push(d));
      writer.on('end', () => resolve(Buffer.concat(bufs).toString('base64')));
  
      writer.write(pcmData);
      writer.end();
    });
}

export async function generateAudio(
    input: ClientInput
): Promise<{ result: GenerateAudioOutput; newApiKeyIndex: number }> {
    const { apiKeys, apiKeyIndex, model: modelName, ...promptInput } = input;

    if (!apiKeys || apiKeys.length === 0) {
        throw new AIOperationError('API key is required.', 'API_KEY_REQUIRED');
    }

    let currentKeyIndex = apiKeyIndex;
    let invalidKeyCount = 0;
    let quotaErrorCount = 0;

    for (let i = 0; i < apiKeys.length; i++) {
        const apiKey = apiKeys[currentKeyIndex];

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: modelName });

            const generationConfig: GenerationConfig = {
                responseMimeType: "audio/wav",
                // @ts-ignore - speechConfig and other tts properties are valid for TTS models
                speechConfig: {
                    multiSpeakerVoiceConfig: {
                        speakerVoiceConfigs: [
                            {
                                speaker: 'Người dẫn chương trình',
                                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Algenib' } },
                            },
                            {
                                speaker: 'Chuyên gia',
                                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Achernar' } },
                            },
                        ],
                    },
                },
            };
            
            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: promptInput.script }] }],
                generationConfig,
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                ]
            });
            
            // The SDK for audio returns raw PCM data in response.candidates[0].content.parts[0].inlineData.data
            const audioPart = result.response.candidates?.[0]?.content?.parts?.[0];
            if (!audioPart || !('inlineData' in audioPart) || !audioPart.inlineData.data) {
                throw new Error("No audio data returned from API.");
            }
            
            const pcmBuffer = Buffer.from(audioPart.inlineData.data, 'base64');
            const wavBase64 = await toWav(pcmBuffer);
            const audioDataUri = `data:audio/wav;base64,${wavBase64}`;

            const validatedOutput = GenerateAudioOutputSchema.parse({ audioDataUri });
            
            console.log(`✅ Generated audio for script.`);
            return { result: validatedOutput, newApiKeyIndex: currentKeyIndex };

        } catch (error: any) {
            const errorMessage = error.message || '';
            const isQuotaError = errorMessage.includes('429');
            const isBadApiKeyError = errorMessage.includes('400');
            
            console.warn(`API Key at index ${currentKeyIndex} failed during audio generation. Reason: ${errorMessage}`);
            
            if (isQuotaError) quotaErrorCount++;
            if (isBadApiKeyError) invalidKeyCount++;

            if ((isQuotaError || isBadApiKeyError) && i < apiKeys.length - 1) {
                currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
                console.log(`Trying next API Key for audio at index ${currentKeyIndex}.`);
            } else {
                console.error('❌ Audio generation error:', error);
                if (error instanceof z.ZodError) {
                  throw new AIOperationError('AI đã trả về dữ liệu âm thanh không hợp lệ.', 'AI_INVALID_FORMAT');
                }
                if (invalidKeyCount === apiKeys.length) {
                    throw new AIOperationError('Tất cả API key đều không hợp lệ.', 'ALL_KEYS_FAILED');
                }
                if (quotaErrorCount === apiKeys.length) {
                    throw new AIOperationError('Tất cả API key đều đã hết dung lượng.', 'ALL_KEYS_FAILED');
                }
                throw new AIOperationError('Không thể tạo podcast từ AI.', 'AI_GENERATION_FAILED');
            }
        }
    }

    throw new AIOperationError('Tất cả các API key đều không thành công.', 'ALL_KEYS_FAILED');
}
