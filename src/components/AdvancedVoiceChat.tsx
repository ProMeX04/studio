"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { GoogleGenAI, Session, LiveServerMessage, Modality } from '@google/genai';
import { Mic, Loader, Power } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { createBlob, decode, decodeAudioData } from "@/lib/audio-utils"

const MODEL_NAME = "gemini-2.0-flash-live-001";

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
const isRecordingRef = useRef(false);
	const [status, setStatus] = useState<"idle" | "connecting" | "recording" | "error">("idle")
const [responses, setResponses] = useState<string[]>([])

	const clientRef = useRef<GoogleGenAI | null>(null)
	const sessionRef = useRef<Session | null>(null);

	const inputAudioContextRef = useRef<AudioContext | null>(null);
	const outputAudioContextRef = useRef<AudioContext | null>(null);
const outputGainNodeRef = useRef<GainNode | null>(null);
	const mediaStreamRef = useRef<MediaStream | null>(null);
	const scriptProcessorNodeRef = useRef<ScriptProcessorNode | null>(null);
	const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
	const nextStartTimeRef = useRef(0);
	const outputSourcesRef = useRef(new Set<AudioBufferSourceNode>());
	const isMountedRef = useRef(true);


	// Keep ref in sync with state
	useEffect(() => {
		isRecordingRef.current = isRecording;
	}, [isRecording]);

	useEffect(() => {
		isMountedRef.current = true;
		
		// Initialize AudioContexts once
		if (!inputAudioContextRef.current) {
			inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
		}
		if (!outputAudioContextRef.current) {
			outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
		}
		// Create gain node once and connect to destination
		if (outputAudioContextRef.current && !outputGainNodeRef.current) {
			outputGainNodeRef.current = outputAudioContextRef.current.createGain();
			outputGainNodeRef.current.connect(outputAudioContextRef.current.destination);
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
		
		if (!currentApiKey || currentApiKey.trim() === '') {
			console.error("API key is missing or empty");
			setStatus("error");
			toast({
				title: "Lỗi API Key",
				description: "Vui lòng kiểm tra API key trong file .env.local",
				variant: "destructive",
			});
			return;
		}
		
		setStatus("connecting");

		try {
			console.log("Connecting to Google GenAI with API key...");
			console.log("Connecting to Google GenAI with API key...");
			const newSession = await clientRef.current.live.connect({
				model: MODEL_NAME,
				callbacks: {
					onopen: () => {
						if (!isMountedRef.current) return;
						console.log("Live session opened successfully");
						setStatus("idle"); // Ready to record
						toast({ title: "Kết nối thành công", description: "Bạn có thể bắt đầu nói." });
					},
					onmessage: (message: LiveServerMessage) => {
						if (!isMountedRef.current) return;
						console.log("Received message:", message);
						const parts = message.serverContent?.modelTurn?.parts;
							const audio = parts?.[0]?.inlineData;
							const textPart = parts?.find(p => (p as any).text)?.text as string | undefined;

							if (textPart) {
								console.log('AI:', textPart);
							}

						if (audio && outputAudioContextRef.current) {
								// Handle AudioContext state asynchronously
								(async () => {
									try {
										const outputContext = outputAudioContextRef.current;
										if (!outputContext) {
											console.warn('Output AudioContext is null');
											outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
											return;
										}
										
										// Check and recreate output AudioContext / Gain if needed
										if (outputContext.state === 'closed') {
											console.warn('Output AudioContext is closed, recreating...');
											outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
											return;
										}
										
										if (outputContext.state === 'suspended') {
											await outputContext.resume();
										}
										
										nextStartTimeRef.current = Math.max(
											nextStartTimeRef.current,
											outputContext.currentTime
										);

										const audioBuffer = await decodeAudioData(
											decode(audio.data!),
											outputContext,
											24000,
											1,
										);
										const source = outputContext.createBufferSource();
										source.buffer = audioBuffer;
										source.connect(outputContext.destination);
										source.start(nextStartTimeRef.current);
										nextStartTimeRef.current += audioBuffer.duration;
									} catch (error) {
										console.error('Error processing audio message:', error);
									}
								})();
						}
					},
					onerror: (e: ErrorEvent) => {
						if (!isMountedRef.current) return;
						console.error("Live session error:", e);
						console.error("Error details:", e.error);
						setStatus("error");
						toast({
							title: "Lỗi kết nối",
							description: e.message || "Có lỗi xảy ra khi kết nối.",
							variant: "destructive",
						});
					},
					onclose: (e: CloseEvent) => {
						if (!isMountedRef.current) return;
						console.log("Live session closed:", e);
						console.log("Close code:", e.code, "Reason:", e.reason);
						sessionRef.current = null;
						setStatus("idle");
						toast({
							title: "Ngắt kết nối",
							description: e.reason || "Kết nối đã bị đóng.",
						});
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
			console.error("Connection failed:", e);
			console.error("Error details:", JSON.stringify(e, null, 2));
			
			let errorMessage = "Không thể kết nối";
			let troubleshooting = "";
			
			// Analyze common connection issues
			if (e.message?.includes('401') || e.message?.includes('authentication')) {
				errorMessage = "API Key không hợp lệ";
				troubleshooting = "Kiểm tra API key trong file .env.local";
			} else if (e.message?.includes('billing')) {
				errorMessage = "Cần kích hoạt billing";
				troubleshooting = "Vào Google Cloud Console → Billing → Enable billing cho project";
			} else if (e.message?.includes('quota')) {
				errorMessage = "Vượt quá giới hạn";
				troubleshooting = "Kiểm tra quota trong Google Cloud Console";
			} else if (e.message?.includes('permission')) {
				errorMessage = "Thiếu quyền truy cập";
				troubleshooting = "Kiểm tra quyền API trong Google Cloud Console";
			} else if (e.message?.includes('API not enabled')) {
				errorMessage = "API chưa được kích hoạt";
				troubleshooting = "Vào Google Cloud Console → APIs & Services → Enable GenAI API";
			}
			
			setStatus("error");
			toast({
				title: errorMessage,
				description: troubleshooting || e.message || "Kiểm tra cài đặt Google Cloud",
				variant: "destructive",
			});
			return null;
		}
	}, [toast]);

	const startRecording = useCallback(async () => {
		if (isRecording || !isMountedRef.current || !inputAudioContextRef.current) return;
		
		// Check if AudioContext is closed or suspended
		if (inputAudioContextRef.current.state === 'closed') {
			console.warn('AudioContext is closed, recreating...');
			inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
		}
		
		if (inputAudioContextRef.current.state === 'suspended') {
			await inputAudioContextRef.current.resume();
		}

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

			let chunkCount = 0;
			scriptProcessorNodeRef.current.onaudioprocess = (audioProcessingEvent) => {
				if (!isRecordingRef.current || !sessionRef.current) return;
				const inputBuffer = audioProcessingEvent.inputBuffer;
				const pcmData = inputBuffer.getChannelData(0);
				if (chunkCount % 50 === 0) {
					console.log(`Sending audio chunk #${chunkCount}, length=${pcmData.length}`);
				}
				chunkCount++;
				try {
					sessionRef.current.sendRealtimeInput({ media: createBlob(pcmData) });
				} catch (err) {
					console.error('Error sendRealtimeInput:', err);
				}
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

		// Signal to server that user input is finished
		if (sessionRef.current) {
			try {
				// Optionally, you can implement `sessionRef.current.end()` if SDK supports it
			} catch (err) {
				console.error('Error sending finish signal:', err);
			}
		}

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
		
		// Keep the session open to receive responses. We'll close it when conversation ends.
		// Don't close AudioContext - keep it for reuse
	}, []);
	
	const handleMicClick = useCallback(async () => {
		if (status === "connecting") return;

		if (isRecording) {
			stopRecording();
			// Do not close the session immediately; allow server to finish responding
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
			clientRef.current = new GoogleGenAI({ apiKey: apiKeys[apiKeyIndex] });
			
			const session = await initSession(apiKeys[apiKeyIndex]);
			if (session) {
				if (outputAudioContextRef.current?.state === 'suspended') {
				await outputAudioContextRef.current.resume();
			}
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
		<>
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

		</>
	)
}
