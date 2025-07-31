
"use client"

import React, { useState } from "react"
import { Mic, Power } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

export function AdvancedVoiceChat() {
	const { toast } = useToast()
	const [isActive, setIsActive] = useState(false);

	const handleMicClick = () => {
		// This is a placeholder for the backend integration.
		// In a real scenario, this would initiate a WebSocket connection
		// or another real-time communication channel with the backend.
		toast({
			title: "Tính năng đang được phát triển",
			description: "Chức năng chat thoại sẽ sớm được kết nối với backend.",
		});
		setIsActive(!isActive); // Toggle for visual feedback
	};

	return (
		<Button
			onClick={handleMicClick}
			size="icon"
			className={cn(
				"relative h-9 w-9 rounded-full transition-all duration-300",
				isActive && "bg-destructive/20 hover:bg-destructive/30",
				!isActive && "bg-secondary hover:bg-secondary/90",
			)}
		>
			{isActive ? <Power className="w-5 h-5 text-destructive" /> : <Mic className="w-5 h-5" />}
			{isActive && (
				<div
					className="absolute inset-[-4px] rounded-full border-2 border-destructive/50 animate-pulse"
				></div>
			)}
		</Button>
	)
}
