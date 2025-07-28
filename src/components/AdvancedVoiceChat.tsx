
"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
    const chatSessionRef = useRef<any | null>(null);
    const aiRef = useRef<GoogleGenerativeAI | null>(null);

    useEffect(() => {
        setIsMounted(true);
        return () => {
            if (chatSessionRef.current) {
                // No explicit close method on stream, just stop processing
                chatSessionRef.current = null;
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

    const disconnectSession = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        mediaRecorderRef.current = null;
        chatSessionRef.current = null;
        setStatus('disconnected');
        audioQueueRef.current = [];
        isPlayingRef.current = false;
    }, []);


    const connectSession = useCallback(async () => {
        if (!isMounted || chatSessionRef.current) return;
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
            
            aiRef.current = new GoogleGenerativeAI(apiKey);

            const model = aiRef.current.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
            
            chatSessionRef.current = model.startChat({
                history: [],
                generationConfig: {
                    // @ts-ignore
                    responseMimeType: "audio/webm",
                }
            });
    
            setStatus('connected');

        } catch (error: any) {
            console.error("Failed to connect to live session:", error);
            toast({ title: "Lỗi kết nối", description: error.message || "Không thể bắt đầu phiên hội thoại.", variant: "destructive" });
            setStatus('disconnected');
        }
    }, [isMounted, apiKeys, apiKeyIndex, toast]);


    const startRecording = async () => {
        if (status !== 'connected' || !chatSessionRef.current) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            
            const audioChunks: BlobPart[] = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorderRef.current.onstart = () => {
                setStatus('recording');
            };
            
            mediaRecorderRef.current.onstop = async () => {
                setStatus('processing');
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64Audio = (reader.result as string).split(',')[1];
                    try {
                        const result = await chatSessionRef.current.sendMessage([
                            {
                                inlineData: {
                                    data: base64Audio,
                                    mimeType: "audio/webm"
                                }
                            }
                        ]);
                        
                        const response = await result.response;
                        const audioContent = response.candidates[0].content.parts.find((part: any) => part.inlineData && part.inlineData.mimeType.startsWith('audio/'));

                        if (audioContent) {
                            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                            }
                            const buffer = Buffer.from(audioContent.inlineData.data, 'base64').buffer;
                            audioQueueRef.current.push(buffer);
                            if (!isPlayingRef.current) {
                                playNextInQueue();
                            }
                        }

                    } catch(e: any) {
                        toast({ title: "Lỗi gửi âm thanh", description: e.message, variant: "destructive" });
                    } finally {
                        setStatus('connected');
                    }
                };
            };

            mediaRecorderRef.current.start();

        } catch (error) {
            console.error("Failed to get microphone access:", error);
            toast({ title: "Lỗi Micro", description: "Không thể truy cập micro.", variant: "destructive" });
            setStatus('connected');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && status === 'recording') {
            mediaRecorderRef.current.stop();
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
