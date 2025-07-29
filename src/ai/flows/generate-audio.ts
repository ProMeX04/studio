
'use server';

/**
 * @fileOverview Flow to generate audio from a podcast script using Google Generative AI SDK.
 * This flow specifically uses a multi-speaker setup for a conversational feel.
 */

import { z } from 'zod';
import { GenerationConfig, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { GenerateAudioInputSchema, GenerateAudioOutputSchema, GenerateAudioOutput } from '@/ai/schemas';
import { performAIOperation } from '@/lib/ai-service';
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

    return performAIOperation({
        apiKeys,
        apiKeyIndex,
        operation: async (genAI) => {
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
            
            const audioPart = result.response.candidates?.[0]?.content?.parts?.[0];
            if (!audioPart || !('inlineData' in audioPart) || !audioPart.inlineData.data) {
                throw new Error("No audio data returned from API.");
            }
            
            const pcmBuffer = Buffer.from(audioPart.inlineData.data, 'base64');
            const wavBase64 = await toWav(pcmBuffer);
            const audioDataUri = `data:audio/wav;base64,${wavBase64}`;

            return GenerateAudioOutputSchema.parse({ audioDataUri });
        }
    });
}
