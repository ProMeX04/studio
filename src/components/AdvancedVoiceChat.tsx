
"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import {
	GoogleGenerativeAI,
	Session,
	Modality,
	LiveServerMessage,
} from "@google/generative-ai"
import { Mic, Loader, Power } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { createBlob, decode, decodeAudioData } from "@/lib/audio-utils"

const MODEL_NAME = "gemini-2.5-flash-preview-native-audio-dialog";

export function AdvancedVoiceChat({
	apiKeys,
	apiKeyIndex,
	onApiKeyIndexChange, // Assuming this is passed to handle key rotation
}: {
	apiKeys: string[]
	apiKeyIndex: number
	onApiKeyIndexChange: (index: number) => void
}) {
	const { toast } = useToast()
	const [isRecording, setIsRecording] = useState(false);
	const [status, setStatus] = useState<"idle" | "connecting" | "recording" | "error">("idle")

	const clientRef = useRef<GoogleGenerativeAI | null>(null)
	const sessionRef = useRef<Session | null>(null);

	const inputAudioContextRef = useRef<AudioContext | null>(null);
	const outputAudioContextRef = useRef<AudioContext | null>(null);
	const mediaStreamRef = useRef<MediaStream | null>(null);
	const scriptProcessorNodeRef = useRef<ScriptProcessorNode | null>(null);
	const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
	const nextStartTimeRef = useRef(0);
	const outputSourcesRef = useRef(new Set<AudioBufferSourceNode>());
	const isMountedRef = useRef(true);


	useEffect(() => {
		isMountedRef.current = true;
		
		// Initialize AudioContexts once
		if (!inputAudioContextRef.current) {
			inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
		}
		if (!outputAudioContextRef.current) {
			outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
		}

		return () => {
			isMountedRef.current = false;
			stopRecording();
			sessionRef.current?.close();
			inputAudioContextRef.current?.close();
			outputAudioContextRef.current?.close();
		}
	}, [])


	const initSession = useCallback(async (currentApiKey: string) => {
		if (!isMountedRef.current || !clientRef.current) return;
		setStatus("connecting");

		try {
			const newSession = await clientRef.current.live.connect({
				model: MODEL_NAME,
				callbacks: {
					onopen: () => {
						if (!isMountedRef.current) return;
						setStatus("idle"); // Ready to record
						toast({ title: "Kết nối thành công", description: "Bạn có thể bắt đầu nói." });
					},
					onmessage: async (message: LiveServerMessage) => {
						if (!isMountedRef.current) return;
						const audio = message.serverContent?.modelTurn?.parts[0]?.inlineData;

						if (audio && outputAudioContextRef.current) {
							nextStartTimeRef.current = Math.max(
								nextStartTimeRef.current,
								outputAudioContextRef.current.currentTime
							);

							const audioBuffer = await decodeAudioData(
								decode(audio.data),
								outputAudioContextRef.current,
								24000,
								1,
							);
							const source = outputAudioContextRef.current.createBufferSource();
							source.buffer = audioBuffer;
							source.connect(outputAudioContextRef.current.destination);
							
							const currentSources = outputSourcesRef.current;
							source.addEventListener('ended', () => {
								currentSources.delete(source);
							});
							
							source.start(nextStartTimeRef.current);
							nextStartTimeRef.current += audioBuffer.duration;
							currentSources.add(source);
						}

						const interrupted = message.serverContent?.interrupted;
						if (interrupted) {
							outputSourcesRef.current.forEach(source => source.stop());
							outputSourcesRef.current.clear();
							nextStartTimeRef.current = 0;
						}
					},
					onerror: (e: ErrorEvent) => {
						if (!isMountedRef.current) return;
						console.error("Session Error:", e);
						toast({ title: "Lỗi Session", description: e.message, variant: "destructive" });
						setStatus("error");
						stopRecording();
					},
					onclose: (e: CloseEvent) => {
						if (!isMountedRef.current) return;
						setStatus("idle");
						stopRecording(); // Ensure everything is cleaned up
					},
				},
				config: {
					responseModalities: [Modality.AUDIO],
					speechConfig: {
						voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Orus' } },
					},
				},
			});
			sessionRef.current = newSession;
			return newSession;
		} catch (e: any) {
			if (!isMountedRef.current) return;
			console.error("Failed to initialize session:", e);
			toast({ title: "Lỗi Khởi tạo", description: e.message, variant: "destructive" });
			setStatus("error");
			return null;
		}
	}, [toast]);

	const startRecording = useCallback(async () => {
		if (isRecording || !isMountedRef.current || !inputAudioContextRef.current) return;
		
		await inputAudioContextRef.current.resume();

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
			if (!isMountedRef.current) return;

			mediaStreamRef.current = stream;
			sourceNodeRef.current = inputAudioContextRef.current.createMediaStreamSource(stream);

			// Use the deprecated but required ScriptProcessorNode
			const bufferSize = 256;
			scriptProcessorNodeRef.current = inputAudioContextRef.current.createScriptProcessor(
				bufferSize,
				1,
				1,
			);

			scriptProcessorNodeRef.current.onaudioprocess = (audioProcessingEvent) => {
				if (!isRecording || !sessionRef.current) return;
				const inputBuffer = audioProcessingEvent.inputBuffer;
				const pcmData = inputBuffer.getChannelData(0);
				sessionRef.current.sendRealtimeInput({ media: createBlob(pcmData) });
			};

			sourceNodeRef.current.connect(scriptProcessorNodeRef.current);
			scriptProcessorNodeRef.current.connect(inputAudioContextRef.current.destination);

			setIsRecording(true);
			setStatus("recording");

		} catch (err: any) {
			console.error('Error starting recording:', err);
			toast({ title: "Lỗi Ghi Âm", description: err.message, variant: "destructive" });
			stopRecording();
			setStatus("error");
		}
	}, [isRecording, toast]);

	const stopRecording = useCallback(() => {
		setIsRecording(false);
		setStatus("idle");

		if (scriptProcessorNodeRef.current) {
			scriptProcessorNodeRef.current.disconnect();
			scriptProcessorNodeRef.current = null;
		}
		if (sourceNodeRef.current) {
			sourceNodeRef.current.disconnect();
			sourceNodeRef.current = null;
		}
		if (mediaStreamRef.current) {
			mediaStreamRef.current.getTracks().forEach((track) => track.stop());
			mediaStreamRef.current = null;
		}
	}, []);
	
	const handleMicClick = useCallback(async () => {
		if (status === "connecting") return;

		if (isRecording) {
			stopRecording();
			sessionRef.current?.close();
			sessionRef.current = null;
		} else {
			if (!apiKeys || apiKeys.length === 0) {
				toast({
					title: "Thiếu API Key",
					description: "Vui lòng thêm API key trong Cài đặt.",
					variant: "destructive",
				})
				return
			}
			
			// Always create a new client with the current key
			clientRef.current = new GoogleGenerativeAI({ apiKey: apiKeys[apiKeyIndex] });
			
			const session = await initSession(apiKeys[apiKeyIndex]);
			if (session) {
				await startRecording();
			}
		}
	}, [isRecording, status, apiKeys, apiKeyIndex, toast, initSession, startRecording, stopRecording]);


	const getButtonContent = () => {
		switch (status) {
			case "connecting":
				return <Loader className="w-5 h-5 animate-spin" />;
			case "recording":
				return (
					<>
						<Power className="w-5 h-5 text-destructive" />
						<div
							className="absolute inset-[-4px] rounded-full border-2 border-destructive/50 animate-pulse"
						></div>
					</>
				);
			case "idle":
			case "error":
			default:
				return (
					<Mic className="w-5 h-5" />
				);
		}
	};

	return (
		<Button
			onClick={handleMicClick}
			size="icon"
			className={cn(
				"relative h-9 w-9 rounded-full transition-all duration-300",
				status === "recording" && "bg-destructive/20 hover:bg-destructive/30",
				status === "idle" && "bg-secondary hover:bg-secondary/90",
				status === "error" && "bg-secondary hover:bg-secondary/90",
				(status === "connecting") && "bg-muted cursor-not-allowed"
			)}
			disabled={status === "connecting"}
		>
			{getButtonContent()}
		</Button>
	)
}
