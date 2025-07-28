
"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import {
	GoogleGenerativeAI,
	GenerativeModel,
	ChatSession,
	InputContent,
} from "@google/generative-ai"
import { Mic, Loader, Power, Waves } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

const MODEL_NAME = "gemini-pro";

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
	const modelRef = useRef<GenerativeModel | null>(null);
	const chatRef = useRef<ChatSession | null>(null);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null)
	const audioChunksRef = useRef<Blob[]>([])
	const audioContextRef = useRef<AudioContext | null>(null)
	const nextStartTimeRef = useRef(0)

	useEffect(() => {
		setIsMounted(true)
		return () => {
			setIsMounted(false)
			disconnectSession()
		}
	}, [])

	const disconnectSession = useCallback(() => {
		if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
			mediaRecorderRef.current.stop()
		}
		mediaRecorderRef.current = null
		chatRef.current = null
		if (audioContextRef.current && audioContextRef.current.state !== "closed") {
			// Don't close, just reset start time for reuse
			nextStartTimeRef.current = 0;
		}
		setStatus("idle")
	}, [])
	
	const blobToBase64 = (blob: Blob): Promise<string> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onloadend = () => {
				const base64data = reader.result as string;
				// remove the data type prefix, e.g. "data:audio/webm;base64,"
				resolve(base64data.split(',')[1]);
			};
			reader.onerror = reject;
			reader.readAsDataURL(blob);
		});
	}

	const decodeAndPlay = useCallback(async (audioData: string) => {
		if (!audioContextRef.current) return
		try {
			const audioBytes = Uint8Array.from(atob(audioData), c => c.charCodeAt(0))
			const audioBuffer = await audioContextRef.current.decodeAudioData(audioBytes.buffer)
			
			const source = audioContextRef.current.createBufferSource()
			source.buffer = audioBuffer
			source.connect(audioContextRef.current.destination)
			
			const now = audioContextRef.current.currentTime
			const startTime = Math.max(now, nextStartTimeRef.current)
			source.start(startTime)
			
			nextStartTimeRef.current = startTime + audioBuffer.duration
		} catch (error) {
			console.error("Error decoding or playing audio:", error)
		}
	}, []);


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

		try {
			const apiKey = apiKeys[apiKeyIndex]
			if (!apiKey) throw new Error("API key không hợp lệ.")
			
			aiRef.current = new GoogleGenerativeAI(apiKey)
			modelRef.current = aiRef.current.getGenerativeModel({ model: MODEL_NAME });

			if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
				audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
			}
			await audioContextRef.current.resume();
			nextStartTimeRef.current = audioContextRef.current.currentTime;

			chatRef.current = modelRef.current.startChat({
				enableBackAndForthMode: true,
			});

			// Start recording
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
			mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });

			mediaRecorderRef.current.ondataavailable = async (event) => {
				if (event.data.size > 0 && chatRef.current) {
					const audioBase64 = await blobToBase64(event.data);
					const input: InputContent = {
						inlineData: {
							mimeType: 'audio/webm',
							data: audioBase64,
						}
					};
					try {
						const result = await chatRef.current.sendMessageStream([input]);
						
						// Handle streaming response
						for await (const chunk of result.stream) {
							const chunkText = chunk.text(); // for potential display
							const audioPart = chunk.candidates?.[0]?.content.parts.find(p => p.inlineData && p.inlineData.mimeType.startsWith('audio/'));
							if (audioPart?.inlineData?.data) {
								await decodeAndPlay(audioPart.inlineData.data);
							}
						}
					} catch(e) {
						console.error("Error sending message:", e);
						toast({ title: "Lỗi", description: "Không thể gửi tin nhắn.", variant: "destructive" });
						disconnectSession();
					}
				}
			};

			mediaRecorderRef.current.onstop = () => {
				stream.getTracks().forEach(track => track.stop());
			};

			mediaRecorderRef.current.start(1000); // Collect 1s chunks
			setStatus("recording")

		} catch (error: any) {
			console.error("Failed to start session:", error)
			toast({
				title: "Lỗi kết nối",
				description: error.message || "Không thể bắt đầu phiên hội thoại.",
				variant: "destructive",
			})
			disconnectSession()
		}
	}, [status, isMounted, apiKeys, apiKeyIndex, toast, disconnectSession, decodeAndPlay])

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
				return <Loader className="w-5 h-5 animate-spin" />;
			case "recording":
				return (
					<>
						<Power className="w-5 h-5" />
						<div
							className="absolute inset-[-4px] rounded-full border-2 border-primary/50 animate-pulse"
						></div>
					</>
				);
			case "idle":
			default:
				return (
					<Mic className="w-5 h-5" />
				);
		}
	};

	if (!isMounted) return null

	return (
		<Button
			onClick={handleMicClick}
			size="icon"
			className={cn(
				"relative h-9 w-9 rounded-full transition-all duration-300",
				status === "recording" && "bg-destructive/80 hover:bg-destructive/70 scale-110",
				status === "idle" && "bg-secondary hover:bg-secondary/90",
				(status === "connecting" || status === "processing") && "bg-muted cursor-not-allowed"
			)}
			disabled={status === "connecting" || status === "processing"}
		>
			{getButtonContent()}
		</Button>
	)
}
