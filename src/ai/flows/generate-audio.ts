
/**
 * @fileOverview Flow to generate audio from a podcast script using Google Generative AI SDK.
 * This flow specifically uses a multi-speaker setup for a conversational feel.
 */

import { z } from 'zod';
import { GenerationConfig, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { GenerateAudioInputSchema, GenerateAudioOutputSchema, GenerateAudioOutput } from '@/ai/schemas';
import { performAIOperation } from '@/lib/ai-service';

const ClientInputSchema = GenerateAudioInputSchema.extend({
    apiKeys: z.array(z.string()),
    apiKeyIndex: z.number(),
});
type ClientInput = z.infer<typeof ClientInputSchema>;

// --- Client-side WAV encoder ---
const encodeWAV = (samples: Float32Array, sampleRate: number): ArrayBuffer => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    const floatTo16BitPCM = (output: DataView, offset: number, input: Float32Array) => {
        for (let i = 0; i < input.length; i++, offset += 2) {
            const s = Math.max(-1, Math.min(1, input[i]));
            output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
    };

    writeString(view, 0, 'RIFF');  // RIFF identifier
    view.setUint32(4, 36 + samples.length * 2, true); // file length
    writeString(view, 8, 'WAVE'); // WAVE identifier
    writeString(view, 12, 'fmt '); // fmt chunk identifier
    view.setUint32(16, 16, true); // chunk length
    view.setUint16(20, 1, true); // audio format (1 is PCM)
    view.setUint16(22, 1, true); // number of channels
    view.setUint32(24, sampleRate, true); // sample rate
    view.setUint32(28, sampleRate * 2, true); // byte rate (sample rate * block align)
    view.setUint16(32, 2, true); // block align (num channels * bits per sample / 8)
    view.setUint16(34, 16, true); // bits per sample
    writeString(view, 36, 'data'); // data chunk identifier
    view.setUint32(40, samples.length * 2, true); // data chunk length
    floatTo16BitPCM(view, 44, samples); // write the PCM samples

    return buffer;
};

const toWavBase64 = (pcmData: Buffer): string => {
    // Google returns 24kHz mono PCM. We need to convert it to Float32Array.
    const int16Array = new Int16Array(pcmData.buffer, pcmData.byteOffset, pcmData.length / 2);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
    }
    
    const wavBuffer = encodeWAV(float32Array, 24000);
    const wavUint8Array = new Uint8Array(wavBuffer);
    
    let binary = '';
    for (let i = 0; i < wavUint8Array.byteLength; i++) {
        binary += String.fromCharCode(wavUint8Array[i]);
    }
    return btoa(binary);
}


export async function generateAudio(
    input: ClientInput
): Promise<{ result: GenerateAudioOutput; newApiKeyIndex: number }> {
    const { apiKeys, apiKeyIndex, model: modelName, ...promptInput } = input;

    return performAIOperation({
        apiKeys,
        apiKeyIndex,
        operation: async (genAI) => {
            const model = genAI.getGenerativeModel({ 
                model: modelName,
                generationConfig: {
                    responseMimeType: "audio/wav", // This is what we request, but Google TTS gives raw PCM
                },
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                ]
            });

            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: promptInput.script }] }],
                // @ts-ignore - speechConfig and other tts properties are valid for TTS models
                generationConfig: {
                    responseModalities: ['AUDIO'],
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
                }
            });
            
            const audioPart = result.response.candidates?.[0]?.content?.parts?.[0];
            if (!audioPart || !('inlineData' in audioPart) || !audioPart.inlineData.data) {
                throw new Error("No audio data returned from API.");
            }
            
            // The data is base64 encoded raw PCM, not a full WAV file.
            const pcmBuffer = Buffer.from(audioPart.inlineData.data, 'base64');
            const wavBase64 = toWavBase64(pcmBuffer);
            const audioDataUri = `data:audio/wav;base64,${wavBase64}`;

            return GenerateAudioOutputSchema.parse({ audioDataUri });
        }
    });
}
