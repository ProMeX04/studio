
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, Session, LiveServerMessage } from '@google/generative-ai';
import { randomUUID } from 'crypto';

// This is an in-memory store for active sessions. 
// In a real production app, you would use a more robust solution like Redis or a database.
const sessions = new Map<string, { session: Session; messageQueue: LiveServerMessage[] }>();

async function getAiInstance(apiKey: string) {
    if (!apiKey) {
        throw new Error("API key is required.");
    }
    return new GoogleGenerativeAI({ apiKey });
}

export async function POST(req: NextRequest) {
    try {
        const { action, sessionId, audioData, apiKey } = await req.json();

        switch (action) {
            case 'connect': {
                if (!apiKey) {
                    return NextResponse.json({ error: 'API Key is required to connect.' }, { status: 400 });
                }
                const ai = await getAiInstance(apiKey);
                const model = 'models/gemini-2.5-flash-preview-native-audio-dialog';
                const config = {
                    responseModalities: ['AUDIO', 'TEXT'],
                    mediaResolution: 'MEDIA_RESOLUTION_MEDIUM',
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                };

                const messageQueue: LiveServerMessage[] = [];

                const newSession = await ai.live.connect({
                    model,
                    config,
                    callbacks: {
                        onmessage: (message: LiveServerMessage) => {
                            messageQueue.push(message);
                        },
                        onerror: (e: ErrorEvent) => console.error('Session Error:', e.message),
                        onclose: () => console.log('Session closed by server.'),
                    },
                });

                const newSessionId = randomUUID();
                sessions.set(newSessionId, { session: newSession, messageQueue });
                
                return NextResponse.json({ sessionId: newSessionId });
            }

            case 'disconnect': {
                if (!sessionId || !sessions.has(sessionId)) {
                    return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
                }
                const { session } = sessions.get(sessionId)!;
                session.close();
                sessions.delete(sessionId);
                return NextResponse.json({ message: 'Session closed' });
            }

            case 'send': {
                if (!sessionId || !sessions.has(sessionId)) {
                    return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
                }
                if (!audioData) {
                    return NextResponse.json({ error: 'No audio data provided' }, { status: 400 });
                }
                const { session } = sessions.get(sessionId)!;
                session.sendClientContent({
                    audio: { inlineData: { data: audioData, mimeType: 'audio/webm' }}
                });
                return NextResponse.json({ message: 'Audio sent' });
            }
            
            case 'poll': {
                if (!sessionId || !sessions.has(sessionId)) {
                    return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
                }
                const sessionData = sessions.get(sessionId)!;
                const message = sessionData.messageQueue.shift();

                if (message?.serverContent?.modelTurn?.parts) {
                    const part = message.serverContent.modelTurn.parts[0];
                    if (part?.inlineData?.data) {
                         return NextResponse.json({ audioData: part.inlineData.data });
                    }
                }
                return NextResponse.json({}); // No new messages
            }

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (error: any) {
        console.error('API Route Error:', error);
        return NextResponse.json({ error: error.message || 'An unknown error occurred' }, { status: 500 });
    }
}
