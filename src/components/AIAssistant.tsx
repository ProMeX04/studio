
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { RefreshCcw, Mic, MicOff, Loader, CircleDot, MessageSquare, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { textToSpeech } from '@/ai/flows/text-to-speech';
import { liveTutor } from '@/ai/flows/live-tutor';
import { ChatMessage } from '@/ai/schemas';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

interface AIAssistantProps {
  context: string;
}

type TutorState = 'idle' | 'listening' | 'processing' | 'speaking';

export function AIAssistant({ context }: AIAssistantProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [tutorState, setTutorState] = useState<TutorState>('idle');
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const startListening = useCallback(() => {
    async function setupMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }

        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 2048;
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);

        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current.onstop = async () => {
          setTutorState('processing');
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = reader.result as string;

            try {
                 const { responseText, updatedHistory } = await liveTutor({
                    audioDataUri: base64Audio,
                    context: context,
                    history: conversationHistory
                });

                setConversationHistory(updatedHistory);
                
                if (responseText && responseText.trim() !== '') {
                    handleAudioPlayback(responseText);
                } else {
                    setTutorState('idle');
                }

            } catch (error) {
                console.error("Live tutor flow error:", error);
                toast({ title: 'Lỗi', description: 'Có lỗi xảy ra khi xử lý giọng nói của bạn.', variant: 'destructive' });
                setTutorState('idle');
            } finally {
                audioChunksRef.current = [];
            }
          };
        };
        
        mediaRecorderRef.current.start();
        setIsRecording(true);
        setTutorState('listening');
        detectSilence(analyserRef.current);

      } catch (err) {
        console.error("Error accessing microphone:", err);
        toast({ title: 'Lỗi micro', description: 'Không thể truy cập micro. Vui lòng cấp quyền.', variant: 'destructive' });
        setTutorState('idle');
      }
    }

    setupMedia();
  }, [toast, context, conversationHistory]);

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Stop all media tracks to turn off mic indicator
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  }, [isRecording]);

  const detectSilence = (analyserNode: AnalyserNode) => {
    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
    
    const check = () => {
        if (!analyserRef.current) return;
        analyserNode.getByteTimeDomainData(dataArray);
        const isSilent = dataArray.every(v => v === 128);
        
        if (isSilent) {
            if (!silenceTimerRef.current) {
                silenceTimerRef.current = setTimeout(() => {
                    if (isRecording) stopListening();
                }, 2000); // 2 seconds of silence
            }
        } else {
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
            }
        }
        if (isRecording) {
            requestAnimationFrame(check);
        }
    };
    if (isRecording) {
      requestAnimationFrame(check);
    }
  };

  const handleAudioPlayback = useCallback(async (text: string) => {
    if (!text.trim()) {
        setTutorState('idle');
        return;
    }
    setTutorState('speaking');
    try {
        const { audioDataUri } = await textToSpeech({ text });
        if(audioDataUri) {
            if (audioRef.current) {
                audioRef.current.pause();
            }
            const audio = new Audio(audioDataUri);
            audioRef.current = audio;
            audio.play().catch(e => {
                console.error("Audio playback failed:", e);
                toast({ title: 'Lỗi âm thanh', description: 'Không thể phát âm thanh.', variant: 'destructive'});
            });
            audio.onended = () => {
                setTutorState('idle');
            };
        } else {
             setTutorState('idle');
        }
    } catch (error) {
        console.error("Text to speech error:", error);
        toast({ title: 'Lỗi', description: 'Không thể chuyển văn bản thành giọng nói.', variant: 'destructive' });
        setTutorState('idle');
    }
  }, [toast]);


  const handleMicClick = () => {
    if (tutorState === 'listening') {
      stopListening();
    } else {
      startListening();
    }
  };

  const resetConversation = () => {
    stopListening();
    setConversationHistory([]);
    setTutorState('idle');
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
    }
    toast({ title: 'Cuộc hội thoại đã được làm mới.' });
  }

  // Cleanup on dialog close
  useEffect(() => {
    if (!isOpen) {
        stopListening();
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
        }
        mediaRecorderRef.current?.stream?.getTracks().forEach(track => track.stop());
    }
  }, [isOpen, stopListening]);

  const getTutorIcon = () => {
    switch (tutorState) {
        case 'idle':
            return <Mic className="h-8 w-8" />;
        case 'listening':
            return <MicOff className="h-8 w-8" />;
        case 'processing':
            return <Loader className="h-8 w-8 animate-spin" />;
        case 'speaking':
            return <CircleDot className="h-8 w-8 animate-pulse" />;
        default:
            return <Mic className="h-8 w-8" />;
    }
  }

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)}
        variant="primary" 
        size="lg" 
        className="fixed bottom-8 right-8 rounded-full w-16 h-16 shadow-lg z-20"
      >
        <MessageSquare />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Trợ lý AI</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center gap-4 p-4 w-full mx-auto">
            <div className="w-full h-64 bg-secondary/30 rounded-lg p-4 overflow-y-auto flex flex-col gap-2">
                {conversationHistory.length === 0 && (
                     <div className="flex items-center justify-center h-full text-muted-foreground">
                        Nhấn nút micro để bắt đầu cuộc trò chuyện với trợ lý AI.
                     </div>
                )}
                {conversationHistory.map((msg, index) => (
                    <div key={index} className={cn("p-2 rounded-lg max-w-[80%]", msg.role === 'user' ? 'bg-primary/80 text-primary-foreground self-end ml-auto' : 'bg-muted text-muted-foreground self-start')}>
                        <p className="text-sm"> <span className="font-bold">{msg.role === 'user' ? 'Bạn' : 'Trợ lý'}:</span> {msg.text}</p>
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-4">
              <Button onClick={resetConversation} variant="outline" size="icon" disabled={tutorState === 'processing'}>
                  <RefreshCcw className="h-5 w-5" />
              </Button>
              <Button 
                  onClick={handleMicClick} 
                  size="lg" 
                  className={cn(
                      "rounded-full w-20 h-20 flex items-center justify-center transition-all duration-300",
                      tutorState === 'listening' ? 'bg-red-500 hover:bg-red-600' : 'bg-primary',
                      tutorState === 'processing' && 'bg-yellow-500'
                      )}
                  disabled={tutorState === 'processing' || tutorState === 'speaking'}
              >
                {getTutorIcon()}
              </Button>
              <div className="w-10 h-10"></div>
            </div>
            <p className="text-sm text-muted-foreground h-5">
                  {tutorState === 'listening' && 'Đang lắng nghe...'}
                  {tutorState === 'processing' && 'Đang xử lý...'}
                  {tutorState === 'speaking' && 'AI đang nói...'}
                  {tutorState === 'idle' && 'Sẵn sàng lắng nghe'}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

