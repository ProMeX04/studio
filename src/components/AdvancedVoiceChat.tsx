
"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import {
	GoogleGenerativeAI,
	Session,
	Modality,
	LiveServerMessage,
} from "@google/generative-ai"
import { Mic, Loader, Power, Waves } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { createBlob, decode, decodeAudioData } from "@/lib/audio-utils"

const MODEL_NAME = "gemini-2.5-flash-preview-native-audio-dialog";

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
	const [isRecording, setIsRecording] = useState(false);
	const [status, setStatus] = useState<"idle" | "connecting" | "recording" | "processing">("idle")
	const [isMounted, setIsMounted] = useState(false)

	const clientRef = useRef<GoogleGenerativeAI | null>(null)
	const sessionRef = useRef<Session | null>(null);

	const inputAudioContextRef = useRef<AudioContext | null>(null);
	const outputAudioContextRef = useRef<AudioContext | null>(null);
	const mediaStreamRef = useRef<MediaStream | null>(null);
	const scriptProcessorNodeRef = useRef<ScriptProcessorNode | null>(null);
	const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
	const nextStartTimeRef = useRef(0);
	const outputSourcesRef = useRef(new Set<AudioBufferSourceNode>());

	useEffect(() => {
		setIsMounted(true)
		// Initialize AudioContexts here, once, if they don't exist.
		if (!inputAudioContextRef.current) {
			inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
		}
		if (!outputAudioContextRef.current) {
			outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
		}
		return () => {
			setIsMounted(false)
			stopRecording();
			sessionRef.current?.close();
		}
	}, [])

	const initSession = useCallback(async () => {
		if (!isMounted || !clientRef.current) return;
		setStatus("connecting");
		const model = MODEL_NAME;
		try {
			const newSession = await clientRef.current.live.connect({
				model: model,
				callbacks: {
					onopen: () => {
						if (!isMounted) return;
						setStatus("idle");
						toast({ title: "Kết nối thành công", description: "Bạn có thể bắt đầu nói." });
					},
					onmessage: async (message: LiveServerMessage) => {
						if (!isMounted) return;
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
							outputSourcesRef.current = currentSources;
						}

						const interrupted = message.serverContent?.interrupted;
						if (interrupted) {
							outputSourcesRef.current.forEach(source => source.stop());
							outputSourcesRef.current.clear();
							nextStartTimeRef.current = 0;
						}
					},
					onerror: (e: ErrorEvent) => {
						if (!isMounted) return;
						console.error("Session Error:", e);
						toast({ title: "Lỗi Session", description: e.message, variant: "destructive" });
						stopRecording();
					},
					onclose: (e: CloseEvent) => {
						if (!isMounted) return;
						toast({ title: "Đã đóng kết nối", description: `Lý do: ${e.reason || 'Không rõ'}` });
						stopRecording();
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
			if (!isMounted) return;
			console.error("Failed to initialize session:", e);
			toast({ title: "Lỗi Khởi tạo", description: e.message, variant: "destructive" });
			setStatus("idle");
			return null;
		}
	}, [isMounted, toast]);

	const startRecording = useCallback(async () => {
		if (isRecording || !isMounted || !inputAudioContextRef.current) return;
		setIsRecording(true);
		setStatus("recording");

		await inputAudioContextRef.current.resume();

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
			mediaStreamRef.current = stream;
			sourceNodeRef.current = inputAudioContextRef.current.createMediaStreamSource(stream);

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

		} catch (err: any) {
			console.error('Error starting recording:', err);
			toast({ title: "Lỗi Ghi Âm", description: err.message, variant: "destructive" });
			stopRecording();
		}

	}, [isRecording, isMounted, toast]);

	const stopRecording = useCallback(() => {
		if (!isMounted) return;
		
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
	}, [isMounted]);
	
	const handleMicClick = useCallback(async () => {
		if (!isMounted) return;

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
			
			if (!clientRef.current) {
				clientRef.current = new GoogleGenerativeAI({ apiKey: apiKeys[apiKeyIndex] });
			}
			
			const session = await initSession();
			if (session) {
				await startRecording();
			}
		}
	}, [isMounted, isRecording, apiKeys, apiKeyIndex, toast, initSession, startRecording, stopRecording]);


	const getButtonContent = () => {
		switch (status) {
			case "connecting":
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
