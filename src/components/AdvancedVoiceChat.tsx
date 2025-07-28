
"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import {
	GoogleGenerativeAI,
	HarmCategory,
	HarmBlockThreshold,
	ChatSession,
} from "@google/generative-ai"
import { Mic, Loader } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

type SessionStatus =
	| "disconnected"
	| "connecting"
	| "connected"
	| "recording"
	| "processing"

// Use the model specified by the user
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
	const [status, setStatus] = useState<SessionStatus>("disconnected")
	const [isMounted, setIsMounted] = useState(false)

	const mediaRecorderRef = useRef<MediaRecorder | null>(null)
	const audioContextRef = useRef<AudioContext | null>(null)
	const audioQueueRef = useRef<ArrayBuffer[]>([])
	const isPlayingRef = useRef(false)
	const chatSessionRef = useRef<ChatSession | null>(null)
	const aiRef = useRef<GoogleGenerativeAI | null>(null)

	useEffect(() => {
		setIsMounted(true)
		return () => {
			// Ensure all resources are cleaned up on unmount
			disconnectSession()
		}
	}, [])

	const playNextInQueue = useCallback(async () => {
		if (
			isPlayingRef.current ||
			audioQueueRef.current.length === 0 ||
			!audioContextRef.current
		) {
			return
		}
		isPlayingRef.current = true
		const audioData = audioQueueRef.current.shift()

		if (audioData) {
			try {
				const audioBuffer = await audioContextRef.current.decodeAudioData(audioData)
				const source = audioContextRef.current.createBufferSource()
				source.buffer = audioBuffer
				source.connect(audioContextRef.current.destination)
				source.onended = () => {
					isPlayingRef.current = false
					if (audioQueueRef.current.length > 0) {
						playNextInQueue();
					} else {
                        // When playback finishes, transition back to connected if not disconnected
                        if (status !== 'disconnected') {
                            setStatus("connected");
                        }
                    }
				}
				source.start()
			} catch (error) {
				console.error("Error playing audio:", error)
				isPlayingRef.current = false
				playNextInQueue() // Try next item even if current one fails
			}
		} else {
			isPlayingRef.current = false
		}
	}, [status])

	const handleServerMessage = useCallback(
		async (response: any) => {
			const parts = response?.candidates?.[0]?.content?.parts ?? [];
			for (const part of parts) {
				if (part.text) {
					console.log("AI Text:", part.text) // Log text for debugging
				}
				// The client-side SDK's stream response for audio is typically in an inlineData part
				if (part.inlineData && part.inlineData.mimeType.startsWith('audio/')) {
					const base64Audio = part.inlineData.data;
					// The base64 data needs to be converted to an ArrayBuffer
					const audioBytes = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0)).buffer;
					audioQueueRef.current.push(audioBytes);
					playNextInQueue();
				}
			}
		},
		[playNextInQueue]
	)
    
	const disconnectSession = useCallback(() => {
		if (mediaRecorderRef.current?.state === "recording") {
			mediaRecorderRef.current.stop()
		}
		mediaRecorderRef.current = null
		chatSessionRef.current = null
		if (audioContextRef.current?.state !== "closed") {
			audioContextRef.current?.close().catch(console.error);
		}
		audioContextRef.current = null
		setStatus("disconnected")
		audioQueueRef.current = []
		isPlayingRef.current = false
		console.log("Session disconnected.")
	}, [])


	const connectSession = useCallback(async () => {
		if (status !== "disconnected" || !isMounted) return
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
			const model = aiRef.current.getGenerativeModel({
				model: MODEL_NAME,
				safetySettings: [
					{ category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
					{ category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
					{ category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
					{ category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
				],
				generationConfig: {
					// Request audio output along with text
					responseMimeType: "audio/wav",
				}
			})

			// Use startChat for client-side bi-directional streaming
			chatSessionRef.current = model.startChat({
				enableBackAndForthMode: true,
				history: [],
			})

			audioContextRef.current = new (window.AudioContext ||(window as any).webkitAudioContext)()
			
			setStatus("connected")
			toast({
				title: "Đã kết nối",
				description: "Nhấn nút micro để bắt đầu nói.",
			})

		} catch (error: any) {
			console.error("Failed to connect to chat session:", error)
			toast({
				title: "Lỗi kết nối",
				description: error.message || "Không thể bắt đầu phiên hội thoại.",
				variant: "destructive",
			})
			disconnectSession()
		}
	}, [isMounted, apiKeys, apiKeyIndex, toast, disconnectSession])


	const startRecording = async () => {
		if (status !== "connected" || !chatSessionRef.current) return

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
			mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: "audio/webm" })
			
			const audioChunks: Blob[] = [];

			mediaRecorderRef.current.ondataavailable = (event) => {
				if (event.data.size > 0) {
					audioChunks.push(event.data);
				}
			}

			mediaRecorderRef.current.onstop = async () => {
				setStatus("processing");
				const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
				audioChunks.length = 0; // Clear the array

				const reader = new FileReader();
				reader.readAsDataURL(audioBlob);
				reader.onloadend = async () => {
					const base64Audio = (reader.result as string).split(',')[1];
					try {
						const result = await chatSessionRef.current?.sendMessageStream([
							{ inlineData: { data: base64Audio, mimeType: 'audio/webm' } },
						]);
						
						if (!result || !result.stream) {
							throw new Error("No stream returned from sendMessageStream.");
						}

						for await (const chunk of result.stream) {
							await handleServerMessage(chunk)
						}

					} catch (e: any) {
						console.error("Error sending or processing stream:", e);
						toast({ title: "Lỗi giao tiếp với AI", description: e.message, variant: "destructive" });
						// Don't disconnect, just return to connected state
                        if (status !== 'disconnected') {
						    setStatus("connected");
                        }
					} 
				}
			}

			mediaRecorderRef.current.onstart = () => {
				setStatus("recording");
			}

			mediaRecorderRef.current.start(); 
		} catch (error) {
			console.error("Failed to get microphone access:", error)
			toast({ title: "Lỗi Micro", description: "Không thể truy cập micro.", variant: "destructive" });
			setStatus("connected") 
		}
	}

	const stopRecording = () => {
		if (mediaRecorderRef.current && status === "recording") {
			mediaRecorderRef.current.stop()
		}
	}

	const handleMicClick = () => {
		if (!isMounted) return;

		switch (status) {
			case "disconnected":
				connectSession()
				break
			case "connected":
				startRecording()
				break
			case "recording":
				stopRecording()
				break
			case "connecting":
			case "processing":
				// Button is disabled
				break
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
						<Mic className="w-8 h-8" />
						<div className="absolute inset-0 rounded-full border-2 border-destructive animate-pulse"></div>
					</>
				)
			case "disconnected":
				return (
					<div className="flex flex-col items-center">
						<Mic className="w-8 h-8" />
						<span className="text-xs mt-1">Bắt đầu</span>
					</div>
				)
			case "connected":
				return <Mic className="w-8 h-8" />
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
					status === "connected" && "bg-primary/80 hover:bg-primary/70",
					status === "disconnected" && "bg-secondary hover:bg-secondary/90",
					(status === "connecting" || status === "processing") && "bg-muted cursor-not-allowed"
				)}
				disabled={status === "connecting" || status === "processing"}
			>
				{getButtonContent()}
			</Button>
			{status !== "disconnected" && (
				<Button
					variant="link"
					size="sm"
					onClick={disconnectSession}
					className="mt-2 text-xs"
				>
					Kết thúc
				</Button>
			)}
		</div>
	)
}
