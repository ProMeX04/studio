
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { RefreshCcw, Mic, MicOff, Loader, CircleDot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { textToSpeech } from '@/ai/flows/text-to-speech';
import { liveTutor, ChatMessage } from '@/ai/flows/live-tutor';
import { QuizQuestion } from './Quiz';

interface LiveTutorProps {
  topic: string;
  quizContext?: QuizQuestion | null;
}

type TutorState = 'idle' | 'listening' | 'processing' | 'speaking';

export function LiveTutor({ topic, quizContext }: LiveTutorProps) {
  const { toast } = useToast();
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

        mediaRecorderRef.current = new MediaRecorder(stream);
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
            
            // Build context
            let contextPrompt = `The user is learning about: ${topic}.`;
            if (quizContext) {
                contextPrompt += ` They are currently on a quiz question: "${quizContext.question}" with options: ${quizContext.options.join(', ')}. The correct answer is ${quizContext.answer}.`;
            }

            try {
                 const { responseText, updatedHistory } = await liveTutor({
                    audioDataUri: base64Audio,
                    context: contextPrompt,
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
  }, [toast, topic, quizContext, conversationHistory]);

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
        analyserNode.getByteTimeDomainData(dataArray);
        const isSilent = dataArray.every(v => v === 128);
        
        if (isSilent) {
            if (!silenceTimerRef.current) {
                silenceTimerRef.current = setTimeout(() => {
                    stopListening();
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


  useEffect(() => {
    if (isRecording) {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        let silenceFrameCount = 0;
        const SILENCE_THRESHOLD = 50; // frames of silence

        const checkSilence = () => {
            if (!isRecording) return;
            analyserRef.current?.getByteFrequencyData(dataArray);
            const sum = dataArray.reduce((a, b) => a + b, 0);
            if (sum / dataArray.length < 2) { // Threshold for silence
                silenceFrameCount++;
            } else {
                silenceFrameCount = 0;
            }

            if (silenceFrameCount > SILENCE_THRESHOLD) {
                stopListening();
            } else {
                requestAnimationFrame(checkSilence);
            }
        };
        checkSilence();
    }
  }, [isRecording, stopListening]);


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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
        }
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
    };
  }, []);

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
    <div className="flex flex-col items-center justify-center gap-4 p-4 w-full max-w-2xl mx-auto">
        <div className="w-full h-64 bg-secondary/30 rounded-lg p-4 overflow-y-auto space-y-4">
            {conversationHistory.length === 0 && (
                 <div className="flex items-center justify-center h-full text-muted-foreground">
                    Nhấn nút micro để bắt đầu cuộc trò chuyện với gia sư AI.
                 </div>
            )}
            {conversationHistory.map((msg, index) => (
                <div key={index} className={cn("p-2 rounded-lg max-w-[80%]", msg.role === 'user' ? 'bg-primary/80 text-primary-foreground self-end ml-auto' : 'bg-muted text-muted-foreground self-start')}>
                    <p className="text-sm"> <span className="font-bold">{msg.role === 'user' ? 'Bạn' : 'Gia sư'}:</span> {msg.text}</p>
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
  );
}
