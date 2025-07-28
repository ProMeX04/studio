
"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import {
	GoogleGenerativeAI,
	HarmCategory,
	HarmBlockThreshold,
	ChatSession,
	Session,
	Modality,
	LiveServerMessage,
} from "@google/generative-ai"
import { Mic, Loader, Power } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { createBlob, decode, decodeAudioData } from "@/lib/audio-utils"

const MODEL_NAME = "gemini-2.5-flash-preview-native-audio-dialog"

export function AdvancedVoiceChat({
	apiKeys,
	apiKeyIndex,
	onApiKeyIndexChange,
}: {
	apiKeys: string[]
	apiKeyIndex: number
	onApiKeyIndexChange: (index: number) => void
}) {
	const { toast } = useToast()
	const [status, setStatus] = useState<"idle" | "connecting" | "recording" | "processing">("idle")
	const [isMounted, setIsMounted] = useState(false)

	const aiRef = useRef<GoogleGenerativeAI | null>(null)
	const sessionRef = useRef<Session | null>(null)
	const inputAudioContextRef = useRef<AudioContext | null>(null)
	const outputAudioContextRef = useRef<AudioContext | null>(null)
	const mediaStreamRef = useRef<MediaStream | null>(null)
	const scriptProcessorNodeRef = useRef<ScriptProcessorNode | null>(null)
	const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
    const nextStartTimeRef = useRef(0);
    const sourcesRef = useRef(new Set<AudioBufferSourceNode>());


	useEffect(() => {
		setIsMounted(true)
		return () => {
			setIsMounted(false)
			disconnectSession(true) // Full cleanup on unmount
		}
	}, [])

	const disconnectSession = useCallback((isUnmounting = false) => {
		if (scriptProcessorNodeRef.current && sourceNodeRef.current) {
			scriptProcessorNodeRef.current.disconnect()
			sourceNodeRef.current.disconnect()
			scriptProcessorNodeRef.current = null
			sourceNodeRef.current = null
		}

		if (mediaStreamRef.current) {
			mediaStreamRef.current.getTracks().forEach((track) => track.stop())
			mediaStreamRef.current = null
		}

		if (sessionRef.current) {
			sessionRef.current.close()
			sessionRef.current = null
		}
        
        // Don't close audio contexts on regular stop, only on unmount
        if (isUnmounting) {
            inputAudioContextRef.current?.close().catch(console.error)
            outputAudioContextRef.current?.close().catch(console.error)
        }

		setStatus("idle")
	}, [])

	const startSession = useCallback(async () => {
		if (status !== "idle" || !isMounted) return
		if (!apiKeys || apiKeys.length === 0) {
			toast({
				title: "Thiếu API Key",
				description: "Vui lòng thêm API key trong Cài đặt.",
				variant: "destructive",
			})
			return
		}

		setStatus("connecting")
		toast({ title: "Đang kết nối..." });

		try {
			const apiKey = apiKeys[apiKeyIndex]
			if (!apiKey) throw new Error("API key không hợp lệ.")

			aiRef.current = new GoogleGenerativeAI(apiKey)
            
            // Initialize AudioContexts if they don't exist or are closed
			if (!inputAudioContextRef.current || inputAudioContextRef.current.state === "closed") {
				inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
			}
			if (!outputAudioContextRef.current || outputAudioContextRef.current.state === "closed") {
				outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
			}

            nextStartTimeRef.current = outputAudioContextRef.current.currentTime;

			sessionRef.current = await aiRef.current.live.connect({
				model: MODEL_NAME,
				config: {
					responseModalities: [Modality.AUDIO],
					speechConfig: {
						voiceConfig: { prebuiltVoiceConfig: { voiceName: "Orus" } },
					},
				},
				callbacks: {
					onopen: () => {
						if (!isMounted) return;
						toast({ title: "Đã kết nối", description: "Bạn có thể bắt đầu nói." });
					},
					onmessage: async (message: LiveServerMessage) => {
						if (!isMounted) return;
						const audio = message.serverContent?.modelTurn?.parts[0]?.inlineData;
						if (audio?.data && outputAudioContextRef.current) {
                            const outputContext = outputAudioContextRef.current;
							nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputContext.currentTime);
							
                            const audioBuffer = await decodeAudioData(
								decode(audio.data),
								outputContext,
								24000,
								1
							);

							const source = outputContext.createBufferSource();
							source.buffer = audioBuffer;
							source.connect(outputContext.destination);
                            
                            source.addEventListener('ended', () => {
                                sourcesRef.current.delete(source);
                            });

							source.start(nextStartTimeRef.current);
							nextStartTimeRef.current += audioBuffer.duration;
                            sourcesRef.current.add(source);
						}

                        const interrupted = message.serverContent?.interrupted;
                        if(interrupted) {
                            sourcesRef.current.forEach(source => source.stop());
                            sourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                        }
					},
					onerror: (e: ErrorEvent) => {
						if (!isMounted) return;
						console.error("Session Error:", e)
						toast({
							title: "Lỗi Session",
							description: e.message || "Đã xảy ra lỗi không xác định.",
							variant: "destructive",
						})
						disconnectSession()
					},
					onclose: (e: CloseEvent) => {
						if (!isMounted) return;
						console.log("Session Closed:", e.reason);
					},
				},
			})

			// --- Start recording AFTER session is established ---
			await inputAudioContextRef.current.resume();

			mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
			
			sourceNodeRef.current = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
			
			const bufferSize = 256;
			scriptProcessorNodeRef.current = inputAudioContextRef.current.createScriptProcessor(bufferSize, 1, 1);
			
			scriptProcessorNodeRef.current.onaudioprocess = (event) => {
				if (status !== 'recording' || !sessionRef.current) return;
				const inputBuffer = event.inputBuffer;
				const pcmData = inputBuffer.getChannelData(0);
				sessionRef.current.sendRealtimeInput({ media: createBlob(pcmData) });
			};
			
			sourceNodeRef.current.connect(scriptProcessorNodeRef.current);
			scriptProcessorNodeRef.current.connect(inputAudioContextRef.current.destination);

			setStatus("recording")

		} catch (error: any) {
			console.error("Failed to start session:", error)
			toast({
				title: "Lỗi kết nối",
				description: error.message?.includes('FETCH_ERROR') 
                    ? 'Không thể kết nối. Vui lòng kiểm tra API key và kết nối mạng.'
                    : (error.message || "Không thể bắt đầu phiên hội thoại."),
				variant: "destructive",
			})
			disconnectSession()
		}
	}, [status, isMounted, apiKeys, apiKeyIndex, toast, disconnectSession])

	const handleMicClick = () => {
		if (!isMounted) return

		if (status === "idle") {
			startSession()
		} else {
			disconnectSession()
		}
	}

	const getButtonContent = () => {
		switch (status) {
			case "connecting":
			case "processing":
				return <Loader className="w-8 h-8 animate-spin" />
			case "recording":
				return (
					<>
						<Power className="w-8 h-8" />
						<div className="absolute inset-0 rounded-full border-2 border-destructive animate-pulse"></div>
					</>
				)
			case "idle":
				return (
					<div className="flex flex-col items-center">
						<Mic className="w-8 h-8" />
						<span className="text-xs mt-1">Bắt đầu</span>
					</div>
				)
		}
	}

	if (!isMounted) return null

	return (
		<div className="flex flex-col h-full w-full items-center justify-center p-4">
			<Button
				onClick={handleMicClick}
				size="lg"
				className={cn(
					"relative rounded-full w-24 h-24 transition-all duration-300",
					status === "recording" && "bg-destructive/80 hover:bg-destructive/70 scale-110",
					status === "idle" && "bg-secondary hover:bg-secondary/90",
					(status === "connecting" || status === "processing") && "bg-muted cursor-not-allowed"
				)}
				disabled={status === "connecting" || status === "processing"}
			>
				{getButtonContent()}
			</Button>
			{status !== "idle" && (
				<p className="mt-4 text-sm text-muted-foreground">
					{status === 'recording' ? 'Đang nói chuyện... Nhấn để kết thúc' : 'Đang xử lý...'}
				</p>
			)}
		</div>
	)
}
