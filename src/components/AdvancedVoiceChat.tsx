
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
import { decode } from "@/lib/audio-utils"

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
	const [status, setStatus] = useState<
		"idle" | "connecting" | "recording" | "processing"
	>("idle")
	const [isMounted, setIsMounted] = useState(false)

	const mediaRecorderRef = useRef<MediaRecorder | null>(null)
	const audioContextRef = useRef<AudioContext | null>(null)
	const audioQueueRef = useRef<ArrayBuffer[]>([])
	const isPlayingRef = useRef(false)
	const chatSessionRef = useRef<ChatSession | null>(null)
	const aiRef = useRef<GoogleGenerativeAI | null>(null)
	const streamRef = useRef<MediaStream | null>(null)

	useEffect(() => {
		setIsMounted(true)
		return () => {
			// Ensure all resources are cleaned up on unmount
			disconnectSession()
		}
	}, [])

	const disconnectSession = useCallback(() => {
		if (mediaRecorderRef.current?.state === "recording") {
			mediaRecorderRef.current.stop()
		}
		if (streamRef.current) {
			streamRef.current.getTracks().forEach((track) => track.stop())
			streamRef.current = null
		}
		if (audioContextRef.current?.state !== "closed") {
			audioContextRef.current?.close().catch(console.error)
		}
		mediaRecorderRef.current = null
		audioContextRef.current = null
		chatSessionRef.current = null
		setStatus("idle")
		audioQueueRef.current = []
		isPlayingRef.current = false
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
				const audioBuffer = await audioContextRef.current.decodeAudioData(
					audioData
				)
				const source = audioContextRef.current.createBufferSource()
				source.buffer = audioBuffer
				source.connect(audioContextRef.current.destination)
				source.onended = () => {
					isPlayingRef.current = false
					playNextInQueue()
				}
				source.start()
			} catch (error) {
				console.error("Error playing audio:", error)
				isPlayingRef.current = false
				playNextInQueue()
			}
		} else {
			isPlayingRef.current = false
		}
	}, [])

	const handleServerMessage = useCallback(
		async (response: any) => {
			try {
				const parts = response?.candidates?.[0]?.content?.parts ?? []
				for (const part of parts) {
					if (part.text) {
						// console.log("AI Text:", part.text); // Log text for debugging
					}
					if (part.audio) {
						const audioBytes = decode(part.audio)
						audioQueueRef.current.push(audioBytes.buffer)
						playNextInQueue()
					}
				}
			} catch (error) {
				console.error("Error processing server message:", error)
			}
		},
		[playNextInQueue]
	)

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
			const model = aiRef.current.getGenerativeModel({ model: MODEL_NAME })

			chatSessionRef.current = model.startChat({
				enableBackAndForthMode: true,
				history: [],
			})

			audioContextRef.current = new (window.AudioContext ||
				(window as any).webkitAudioContext)()
			streamRef.current = await navigator.mediaDevices.getUserMedia({
				audio: true,
			})

			mediaRecorderRef.current = new MediaRecorder(streamRef.current)
			const audioChunks: Blob[] = []

			mediaRecorderRef.current.ondataavailable = (event) => {
				if (event.data.size > 0) {
					audioChunks.push(event.data)
				}
			}

			mediaRecorderRef.current.onstop = async () => {
				if (status === "idle") return // Session was disconnected
				setStatus("processing")
				const audioBlob = new Blob(audioChunks, {
					type: "audio/webm",
				})
				audioChunks.length = 0

				const reader = new FileReader()
				reader.readAsDataURL(audioBlob)
				reader.onloadend = async () => {
					const base64Audio = (reader.result as string).split(",")[1]
					try {
						if (!chatSessionRef.current) {
							throw new Error("Chat session not initialized.")
						}
						const result =
							await chatSessionRef.current.sendMessageStream([
								{
									inlineData: {
										data: base64Audio,
										mimeType: "audio/webm",
									},
								},
							])

						for await (const chunk of result.stream) {
							await handleServerMessage(chunk)
						}
					} catch (e: any) {
						console.error(
							"Error sending or processing stream:",
							e
						)
						toast({
							title: "Lỗi giao tiếp với AI",
							description: e.message,
							variant: "destructive",
						})
					} finally {
						// When processing is done, go back to recording state if not idle
						if (status !== "idle") {
							setStatus("recording")
						}
					}
				}
			}

			mediaRecorderRef.current.start(1000) // Collect 1-second chunks
			setStatus("recording")
			toast({
				title: "Đã kết nối",
				description: "Bạn có thể bắt đầu nói.",
			})
		} catch (error: any) {
			console.error("Failed to start session:", error)
			toast({
				title: "Lỗi kết nối",
				description:
					error.message || "Không thể bắt đầu phiên hội thoại.",
				variant: "destructive",
			})
			disconnectSession()
		}
	}, [
		status,
		isMounted,
		apiKeys,
		apiKeyIndex,
		toast,
		disconnectSession,
		handleServerMessage,
	])

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
						<Mic className="w-8 h-8" />
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
					status === "recording" &&
						"bg-destructive/80 hover:bg-destructive/70 scale-110",
					status === "idle" && "bg-secondary hover:bg-secondary/90",
					(status === "connecting" || status === "processing") &&
						"bg-muted cursor-not-allowed"
				)}
				disabled={status === "connecting" || status === "processing"}
			>
				{getButtonContent()}
			</Button>
			{status !== "idle" && (
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
