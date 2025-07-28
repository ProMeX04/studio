
"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// This component now interacts with our own backend API route, not directly with Google AI.

type SessionStatus = 'disconnected' | 'connecting' | 'connected' | 'recording' | 'processing';

export function AdvancedVoiceChat({ apiKeys, apiKeyIndex, onApiKeyIndexChange }: { apiKeys: string[]; apiKeyIndex: number; onApiKeyIndexChange: (index: number) => void; }) {
    const { toast } = useToast();
    const [status, setStatus] = useState<SessionStatus>('disconnected');
    const [isMounted, setIsMounted] = useState(false);
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioQueueRef = useRef<ArrayBuffer[]>([]);
    const isPlayingRef = useRef(false);
    const sessionRef = useRef<{ id: string } | null>(null);

    useEffect(() => {
        setIsMounted(true);
        return () => {
            if (sessionRef.current) {
                disconnectSession();
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
    
    const pollForMessages = useCallback(async () => {
        if (status !== 'recording' && status !== 'processing') return;
        if (!sessionRef.current) return;
        
        try {
            const response = await fetch('/api/live', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'poll', sessionId: sessionRef.current.id }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Polling error:', errorData.error);
                return;
            }

            const { audioData } = await response.json();

            if (audioData) {
                if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                }
                const buffer = Buffer.from(audioData, 'base64').buffer;
                audioQueueRef.current.push(buffer);
                if (!isPlayingRef.current) {
                    playNextInQueue();
                }
            }
        } catch (error) {
            console.error('Failed to poll for messages:', error);
        } finally {
            if (sessionRef.current) { // Check if still connected
                setTimeout(pollForMessages, 500); // Continue polling
            }
        }
    }, [status, playNextInQueue]);


    const connectSession = useCallback(async () => {
        if (!isMounted || sessionRef.current) return;
        if (!apiKeys || apiKeys.length === 0) {
            toast({ title: "Thiếu API Key", description: "Vui lòng thêm API key trong Cài đặt.", variant: "destructive" });
            return;
        }
        setStatus('connecting');
        
        try {
            const response = await fetch('/api/live', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'connect', apiKey: apiKeys[apiKeyIndex] }),
            });

            if (!response.ok) {
                throw new Error('Failed to connect to the session.');
            }
            
            const { sessionId } = await response.json();
            sessionRef.current = { id: sessionId };
            setStatus('connected');

        } catch (error: any) {
            console.error("Failed to connect to live session:", error);
            toast({ title: "Lỗi kết nối", description: error.message || "Không thể bắt đầu phiên hội thoại.", variant: "destructive" });
            setStatus('disconnected');
        }
    }, [isMounted, toast, apiKeys, apiKeyIndex]);

    const disconnectSession = useCallback(async () => {
        if (!sessionRef.current) return;
        
        const sessionId = sessionRef.current.id;
        sessionRef.current = null; // Prevent further polling
        
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        mediaRecorderRef.current = null;
        setStatus('disconnected');
        audioQueueRef.current = [];
        isPlayingRef.current = false;

        try {
            await fetch('/api/live', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'disconnect', sessionId }),
            });
        } catch (error) {
             console.error("Error sending disconnect message:", error);
        }

    }, []);

    const startRecording = async () => {
        if (status !== 'connected') return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });

            mediaRecorderRef.current.ondataavailable = async (event) => {
                if (event.data.size > 0 && sessionRef.current) {
                   const reader = new FileReader();
                    reader.readAsDataURL(event.data);
                    reader.onloadend = async () => {
                        const base64Audio = (reader.result as string).split(',')[1];
                        try {
                             await fetch('/api/live', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                    action: 'send', 
                                    sessionId: sessionRef.current?.id, 
                                    audioData: base64Audio 
                                }),
                            });
                        } catch (error) {
                            console.error("Error sending audio data:", error);
                        }
                    };
                }
            };

            mediaRecorderRef.current.onstart = () => {
                setStatus('recording');
                pollForMessages(); // Start polling for messages
            };
            
            mediaRecorderRef.current.onstop = () => {
                const checkQueue = setInterval(() => {
                    if (audioQueueRef.current.length === 0 && !isPlayingRef.current) {
                        setStatus('connected');
                        clearInterval(checkQueue);
                    }
                }, 100);
            };

            mediaRecorderRef.current.start(500);

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
                // Do nothing
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

