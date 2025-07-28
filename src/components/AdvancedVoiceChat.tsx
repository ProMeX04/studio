"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Loader, Bot, User, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { connectToLiveSession, sendToLiveSession, pollLiveSession, closeLiveSession } from '@/ai/flows/live-dialog';
import type { DialogTurn } from '@/ai/schemas';
import { AIOperationError } from '@/lib/ai-utils';

const POLLING_INTERVAL = 1500; // ms

interface AdvancedVoiceChatProps {
    apiKeys: string[];
    apiKeyIndex: number;
    onApiKeyIndexChange: (index: number) => void;
}

export function AdvancedVoiceChat({ apiKeys, apiKeyIndex, onApiKeyIndexChange }: AdvancedVoiceChatProps) {
    const { toast } = useToast();
    const [isRecording, setIsRecording] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [conversation, setConversation] = useState<DialogTurn[]>([]);
    const [sessionId, setSessionId] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const conversationEndRef = useRef<HTMLDivElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    useEffect(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
    }, []);

    const scrollToBottom = () => {
        conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [conversation]);

    const playAudio = useCallback(async (audioDataUri: string) => {
        if (!audioContextRef.current || !audioDataUri) return;

        try {
            const base64Data = audioDataUri.split(',')[1];
            const audioBuffer = Buffer.from(base64Data, 'base64');
            const decodedAudioData = await audioContextRef.current.decodeAudioData(audioBuffer.buffer);
            
            const source = audioContextRef.current.createBufferSource();
            source.buffer = decodedAudioData;
            source.connect(audioContextRef.current.destination);
            source.start();
        } catch (error) {
            console.error("Failed to play audio:", error);
            toast({
                title: "Lỗi phát âm thanh",
                description: "Không thể giải mã hoặc phát file âm thanh từ AI.",
                variant: "destructive"
            });
        }
    }, [toast]);
    
    const pollForResponses = useCallback(async (currentSessionId: string) => {
        if (!currentSessionId) return;

        try {
            const response = await pollLiveSession({ sessionId: currentSessionId });
            if (response && response.parts.length > 0) {
                setConversation(prev => {
                    // Find the last "processing" turn and update it
                    const lastTurnIndex = prev.findLastIndex(p => p.isProcessing);
                    if (lastTurnIndex > -1) {
                        const newConversation = [...prev];
                        const updatedTurn = { ...newConversation[lastTurnIndex], isProcessing: false };
                        let combinedText = '';

                        response.parts.forEach(part => {
                            if (part.text) combinedText += part.text + ' ';
                            if (part.audio) {
                                // For simplicity, we play audio as it arrives. A more complex implementation
                                // might queue it or associate it with specific text.
                                playAudio(`data:audio/wav;base64,${part.audio}`);
                            }
                        });
                        updatedTurn.text = combinedText.trim();
                        newConversation[lastTurnIndex] = updatedTurn;
                        return newConversation;
                    }
                    return prev;
                });
            }
        } catch (error) {
            console.error("Polling error:", error);
        } finally {
            if (sessions.get(currentSessionId)) { // Check if session is still active
                pollingRef.current = setTimeout(() => pollForResponses(currentSessionId), POLLING_INTERVAL);
            }
        }
    }, [playAudio]);

    const startSession = useCallback(async () => {
        if (sessionId) return;
        if (!apiKeys || apiKeys.length === 0) {
            toast({ title: "Thiếu API Key", description: "Vui lòng nhập API Key Gemini trong phần Cài đặt.", variant: "destructive" });
            return;
        }

        setIsConnecting(true);
        setConversation([{ id: Date.now(), speaker: 'model', text: 'Xin chào, tôi có thể giúp gì cho bạn?' }]);
        
        try {
            const { sessionId: newSessionId } = await connectToLiveSession({ apiKeys, apiKeyIndex });
            setSessionId(newSessionId);
            pollingRef.current = setTimeout(() => pollForResponses(newSessionId), POLLING_INTERVAL);
        } catch (error) {
            console.error("Failed to connect to live session:", error);
            const message = error instanceof AIOperationError ? error.message : "Không thể bắt đầu phiên hội thoại.";
            toast({ title: "Lỗi kết nối", description: message, variant: "destructive" });
            setConversation([]);
        } finally {
            setIsConnecting(false);
        }
    }, [sessionId, apiKeys, apiKeyIndex, toast, pollForResponses]);

    const stopSession = useCallback(async () => {
        if (pollingRef.current) clearTimeout(pollingRef.current);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        
        if (sessionId) {
            try {
                await closeLiveSession({ sessionId });
            } catch (error) {
                console.error("Error closing session on server:", error);
            }
        }
        setSessionId(null);
        setConversation([]);
    }, [sessionId]);

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            stopSession();
        };
    }, [stopSession]);


    const handleStartRecording = async () => {
        if (!sessionId) {
            await startSession();
        }

        if (isRecording || isSending) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                setIsSending(true);
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                
                // Add a placeholder for user's turn
                const userTurnId = Date.now();
                setConversation(prev => [...prev, { id: userTurnId, speaker: 'user', text: '...' }]);
                
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64Audio = (reader.result as string).split(',')[1];
                    try {
                        if(sessionId) {
                            const { newApiKeyIndex } = await sendToLiveSession({
                                sessionId,
                                audio: base64Audio,
                                mimeType: audioBlob.type,
                                apiKeys,
                                apiKeyIndex,
                            });
                            onApiKeyIndexChange(newApiKeyIndex);
                            
                            // Add placeholder for model's response
                            setConversation(prev => [
                                ...prev, 
                                { id: Date.now(), speaker: 'model', text: '', isProcessing: true }
                            ]);
                        }
                    } catch (error: any) {
                        const message = error instanceof AIOperationError ? error.message : "Không thể gửi âm thanh đến AI.";
                        toast({ title: "Lỗi gửi âm thanh", description: message, variant: "destructive" });
                        // Remove user placeholder on error
                        setConversation(prev => prev.filter(turn => turn.id !== userTurnId));
                    } finally {
                        setIsSending(false);
                    }
                };
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (error) {
            console.error("Failed to get microphone access:", error);
            toast({ title: "Lỗi Micro", description: "Không thể truy cập micro. Vui lòng cấp quyền trong cài đặt trình duyệt.", variant: "destructive" });
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };


    return (
        <div className="flex flex-col h-full w-full max-w-xl mx-auto p-4 justify-center">
            <Card className="w-full h-full flex flex-col bg-background/70 backdrop-blur-sm overflow-hidden">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mic />
                        <span>Trợ lý giọng nói</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-grow overflow-hidden flex flex-col gap-4">
                    <ScrollArea className="flex-grow pr-4 -mr-4">
                        <div className="space-y-4">
                            {conversation.map((turn, index) => (
                                <div key={index} className={cn("flex items-end gap-2", turn.speaker === 'user' ? "justify-end" : "justify-start")}>
                                    {turn.speaker === 'model' && <Bot className="w-6 h-6 shrink-0" />}
                                    <div className={cn("max-w-[80%] p-3 rounded-lg", turn.speaker === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary')}>
                                        {turn.isProcessing ? (
                                            <div className="flex items-center gap-2">
                                                <Loader className="w-4 h-4 animate-spin"/>
                                                <span>Đang xử lý...</span>
                                            </div>
                                        ) : (
                                            <p>{turn.text}</p>
                                        )}
                                    </div>
                                    {turn.speaker === 'user' && <User className="w-6 h-6 shrink-0" />}
                                </div>
                            ))}
                             <div ref={conversationEndRef} />
                        </div>
                    </ScrollArea>
                    <div className="flex flex-col items-center justify-center pt-4 border-t border-border">
                        {sessionId ? (
                            <div className="flex flex-col items-center gap-4">
                               <Button
                                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                                    size="lg"
                                    className={cn("rounded-full w-20 h-20", isRecording && "bg-destructive hover:bg-destructive/90")}
                                    disabled={isSending}
                                >
                                    {isSending ? <Loader className="w-8 h-8 animate-spin" /> : <Mic className="w-8 h-8" />}
                                </Button>
                                <Button variant="link" onClick={stopSession}>Kết thúc phiên</Button>
                            </div>
                        ) : (
                            <Button onClick={startSession} disabled={isConnecting}>
                                {isConnecting && <Loader className="animate-spin mr-2 h-4 w-4" />}
                                Bắt đầu cuộc trò chuyện
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
