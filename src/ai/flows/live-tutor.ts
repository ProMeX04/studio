
'use server';

/**
 * @fileOverview Flow to handle a turn in a live conversation with a tutor.
 * It takes the user's audio, the conversation context, and history,
 * then returns the AI's text response and the updated history.
 */

import { ai } from '@/ai/genkit';
import { LiveTutorInputSchema, LiveTutorOutputSchema, type LiveTutorInput, type LiveTutorOutput, type ChatMessage } from '@/ai/schemas';

export async function liveTutor(input: LiveTutorInput): Promise<LiveTutorOutput> {
    const { audioDataUri, context, history } = input;

    const prompt = [
        { text: `You are a friendly and helpful AI tutor. ${context}` },
        ...history.map(msg => ({
            role: msg.role,
            content: [{ text: msg.text }]
        })),
        { role: 'user', content: [{ media: { url: audioDataUri, contentType: 'audio/webm' } }, {text: "Transcribe the audio and respond to it."}] }
    ];

    try {
        const result = await ai.generate({
            // @ts-ignore
            prompt: prompt,
            model: 'googleai/gemini-2.5-flash'
        });
        
        const modelResponse = result.text;

        if (!modelResponse || modelResponse.trim() === '') {
            return { responseText: '', updatedHistory: history };
        }

        // To get the user's transcribed text, we'd ideally get it from the model.
        // For now, we'll skip adding the user's audio transcription to history to avoid another call
        // and just add the model's response.
        const updatedHistory: ChatMessage[] = [
            ...history,
            { role: 'model', text: modelResponse },
        ];
        
        return { responseText: modelResponse, updatedHistory };

    } catch (e) {
        console.error("Error in liveTutor flow:", e);
        // Return a safe error state
        return {
            responseText: "I'm sorry, I encountered an error. Please try again.",
            updatedHistory: [...history, { role: 'model', text: "I'm sorry, I encountered an error. Please try again."}]
        }
    }
}
