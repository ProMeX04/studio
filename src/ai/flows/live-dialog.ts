'use server';

/**
 * @fileOverview Flow to manage a live, streaming dialog session with Google AI.
 * This is a simplified simulation for a web environment. In a real-world server,
 * you would likely use WebSockets for a more robust implementation.
 */

import { GoogleGenerativeAI, GenerationConfig, HarmCategory, HarmBlockThreshold, Content, Part, InlineDataPart } from '@google/generative-ai';
import { z } from 'zod';
import { AIOperationError } from '@/lib/ai-utils';
import { LiveDialogResponse, LiveDialogResponseSchema, LiveDialogResponsePart } from '@/ai/schemas';

// In-memory store for sessions. In a real application, you'd use a more persistent store like Redis.
const sessions = new Map<string, any>(); 
const sessionMessages = new Map<string, LiveDialogResponsePart[]>();

const modelName = 'gemini-1.5-flash-latest'; // Using a standard model that supports text/audio input

interface FlowClientInput {
    apiKeys: z.infer<typeof z.array(z.string)>;
    apiKeyIndex: z.infer<typeof z.number>;
}

export async function connectToLiveSession(input: FlowClientInput): Promise<{ sessionId: string }> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    // Store a placeholder. The actual session object is complex and stateful,
    // which is hard to manage in a serverless environment. We'll manage state via API keys.
    sessions.set(sessionId, { status: 'connected', apiKeyIndex: input.apiKeyIndex });
    sessionMessages.set(sessionId, []);
    console.log(`✅ New live session created: ${sessionId}`);
    return { sessionId };
}

export async function sendToLiveSession(input: {
    sessionId: string;
    text?: string;
    audio?: string; // base64 encoded audio
    mimeType?: string;
    apiKeys: string[];
    apiKeyIndex: number;
}): Promise<{ success: boolean; newApiKeyIndex: number }> {
    const { sessionId, text, audio, mimeType, apiKeys, apiKeyIndex } = input;
    
    if (!sessions.has(sessionId)) {
        throw new AIOperationError('Invalid session ID.', 'UNEXPECTED');
    }
    
    if (!apiKeys || apiKeys.length === 0) {
        throw new AIOperationError('API key is required.', 'API_KEY_REQUIRED');
    }

    let currentKeyIndex = apiKeyIndex;

    try {
        const apiKey = apiKeys[currentKeyIndex];
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
            model: modelName,
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ]
        });

        const parts: Part[] = [];
        if (text) {
            parts.push({ text });
        }
        if (audio && mimeType) {
            parts.push({ inlineData: { mimeType, data: audio } });
        }

        if (parts.length === 0) {
            throw new Error("No content to send.");
        }

        const result = await model.generateContent({
            contents: [{ role: "user", parts }]
        });

        const response = result.response;
        const responseText = response.text();
        
        const responseParts: LiveDialogResponsePart[] = [{ text: responseText }];

        // Store the message to be polled by the client
        const currentMessages = sessionMessages.get(sessionId) || [];
        sessionMessages.set(sessionId, [...currentMessages, ...responseParts]);

        return { success: true, newApiKeyIndex: currentKeyIndex };

    } catch (error: any) {
        console.error('❌ Live Dialog Error:', error);
        throw new AIOperationError('Failed to process live dialog turn.', 'AI_GENERATION_FAILED');
    }
}

export async function pollLiveSession(input: { sessionId: string }): Promise<LiveDialogResponse> {
    const { sessionId } = input;
    if (!sessions.has(sessionId)) {
        throw new AIOperationError('Invalid session ID.', 'UNEXPECTED');
    }

    const messages = sessionMessages.get(sessionId) || [];
    // Clear messages after polling
    sessionMessages.set(sessionId, []); 

    return { parts: messages };
}

export async function closeLiveSession(input: { sessionId: string }): Promise<{ success: boolean }> {
    const { sessionId } = input;
    if (sessions.has(sessionId)) {
        sessions.delete(sessionId);
        sessionMessages.delete(sessionId);
        console.log(`- Live session closed: ${sessionId}`);
        return { success: true };
    }
    return { success: false };
}
