
"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenerativeAI, Session, LiveServerMessage } from '@google/generative-ai';
import { Mic, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type SessionStatus = 'disconnected' | 'connecting' | 'connected' | 'recording' | 'processing';

export function AdvancedVoiceChat({ apiKeys, apiKeyIndex, onApiKeyIndexChange }: { apiKeys: string[]; apiKeyIndex: number; onApiKeyIndexChange: (index: number) => void; }) {
    const { toast } = useToast();
    const [status, setStatus] = useState<SessionStatus>('disconnected');
    const [isMounted, setIsMounted] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioQueueRef = useRef<ArrayBuffer[]>([]);
    const isPlayingRef = useRef(false);
    const sessionRef = useRef<Session | null>(null);
    const aiRef = useRef<GoogleGenerativeAI | null>(null);

    useEffect(() => {
        setIsMounted(true);
        return () => {
            if (sessionRef.current) {
                sessionRef.current.close();
            }
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
            }
        };
    }, []);

    const playNextInQueue = useCallback(async () => {
        if (isPlayingRef.current || audioQueueRef.current.length === 0) {
            return;
        }
        isPlayingRef.current = true;
        const audioData = audioQueueRef.current.shift();
        if (audioData && audioContextRef.current) {
            try {
                const audioBuffer = await audioContextRef.current.decodeAudioData(audioData);
                const source = audioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContextRef.current.destination);
                source.onended = () => {
                    isPlayingRef.current = false;
                    playNextInQueue();
                };
                source.start();
            } catch (error) {
                console.error("Error playing audio:", error);
                isPlayingRef.current = false;
                playNextInQueue();
            }
        } else {
            isPlayingRef.current = false;
        }
    }, []);

    const handleServerMessage = useCallback((message: LiveServerMessage) => {
        if (message.serverContent?.modelTurn?.parts) {
            const part = message.serverContent.modelTurn.parts[0];
            if (part?.inlineData?.data) {
                if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                }
                const buffer = Buffer.from(part.inlineData.data, 'base64').buffer;
                audioQueueRef.current.push(buffer);
                if (!isPlayingRef.current) {
                    playNextInQueue();
                }
            }
        }
    }, [playNextInQueue]);
    
    const disconnectSession = useCallback(() => {
        if (sessionRef.current) {
            sessionRef.current.close();
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        mediaRecorderRef.current = null;
        sessionRef.current = null;
        setStatus('disconnected');
        audioQueueRef.current = [];
        isPlayingRef.current = false;
    }, []);


    const connectSession = useCallback(async () => {
        if (!isMounted || sessionRef.current) return;
        if (!apiKeys || apiKeys.length === 0) {
            toast({ title: "Thiếu API Key", description: "Vui lòng thêm API key trong Cài đặt.", variant: "destructive" });
            return;
        }
        setStatus('connecting');
        
        try {
            const apiKey = apiKeys[apiKeyIndex];
            if (!apiKey) {
                 throw new Error("API key không hợp lệ.");
            }
            
            aiRef.current = new GoogleGenerativeAI({ apiKey });

            const model = 'models/gemini-2.5-flash-preview-native-audio-dialog';
            const config = {
                responseModalities: ['AUDIO', 'TEXT'],
                mediaResolution: 'MEDIA_RESOLUTION_MEDIUM',
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
            };
    
            const newSession = await aiRef.current.live.connect({
                model,
                config,
                callbacks: {
                    onmessage: handleServerMessage,
                    onerror: (e: ErrorEvent) => {
                        console.error('Session Error:', e.message);
                        toast({ title: "Lỗi Session", description: e.message, variant: "destructive" });
                        disconnectSession();
                    },
                    onclose: () => {
                        console.log('Session closed by server.');
                        disconnectSession();
                    },
                },
            });

            sessionRef.current = newSession;
            setStatus('connected');

        } catch (error: any) {
            console.error("Failed to connect to live session:", error);
            toast({ title: "Lỗi kết nối", description: error.message || "Không thể bắt đầu phiên hội thoại.", variant: "destructive" });
            setStatus('disconnected');
        }
    }, [isMounted, apiKeys, apiKeyIndex, toast, handleServerMessage, disconnectSession]);


    const startRecording = async () => {
        if (status !== 'connected' || !sessionRef.current) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0 && sessionRef.current) {
                   const reader = new FileReader();
                    reader.readAsDataURL(event.data);
                    reader.onloadend = () => {
                        const base64Audio = (reader.result as string).split(',')[1];
                        if (sessionRef.current) {
                            sessionRef.current.sendClientContent({
                                audio: { inlineData: { data: base64Audio, mimeType: 'audio/webm' }}
                            });
                        }
                    };
                }
            };

            mediaRecorderRef.current.onstart = () => {
                setStatus('recording');
            };
            
            mediaRecorderRef.current.onstop = () => {
                // Wait for the final audio to be played before setting status back to connected
                const checkQueue = setInterval(() => {
                    if (audioQueueRef.current.length === 0 && !isPlayingRef.current) {
                        setStatus('connected');
                        clearInterval(checkQueue);
                    }
                }, 100);
            };

            mediaRecorderRef.current.start(500); // Send data every 500ms

        } catch (error) {
            console.error("Failed to get microphone access:", error);
            toast({ title: "Lỗi Micro", description: "Không thể truy cập micro.", variant: "destructive" });
            setStatus('connected');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && status === 'recording') {
            mediaRecorderRef.current.stop();
            setStatus('processing');
        }
    };

    const handleMicClick = () => {
        if (!isMounted) return;

        switch (status) {
            case 'disconnected':
                connectSession();
                break;
            case 'connected':
                startRecording();
                break;
            case 'recording':
                stopRecording();
                break;
            case 'connecting':
            case 'processing':
                // Do nothing, wait for the state to change
                break;
        }
    };

    const getButtonContent = () => {
        switch (status) {
            case 'connecting':
            case 'processing':
                return <Loader className="w-8 h-8 animate-spin" />;
            case 'recording':
                 return (
                    <>
                        <Mic className="w-8 h-8" />
                        <div className="absolute inset-0 rounded-full border-2 border-destructive animate-pulse"></div>
                    </>
                );
            case 'disconnected':
                 return (
                    <div className="flex flex-col items-center">
                        <Mic className="w-8 h-8" />
                        <span className="text-xs mt-1">Bắt đầu</span>
                    </div>
                 );
            case 'connected':
                 return <Mic className="w-8 h-8" />;
        }
    };
    
    if (!isMounted) return null;

    return (
        <div className="flex flex-col h-full w-full items-center justify-center p-4">
             <Button
                onClick={handleMicClick}
                size="lg"
                className={cn(
                    "relative rounded-full w-24 h-24 transition-all duration-300",
                    status === 'recording' && "bg-destructive/80 hover:bg-destructive/70 scale-110",
                    status === 'connected' && "bg-primary/80 hover:bg-primary/70",
                    status === 'disconnected' && "bg-secondary hover:bg-secondary/90",
                    (status === 'connecting' || status === 'processing') && "bg-muted cursor-not-allowed"
                )}
                disabled={status === 'connecting' || status === 'processing'}
            >
                {getButtonContent()}
            </Button>
            {status !== 'disconnected' && (
                 <Button variant="link" size="sm" onClick={disconnectSession} className="mt-2 text-xs">
                    Kết thúc
                </Button>
            )}
        </div>
    );
}

