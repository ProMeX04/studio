
"use client"

import { useState, useCallback } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatInputProps {
	onActivate: (initialQuestion?: string) => void;
	className?: string;
	placeholder?: string;
	title?: string;
}

export function ChatInput({ 
	onActivate, 
	className, 
	placeholder = "Hỏi AI về nội dung này...",
	title
}: ChatInputProps) {
	const [inputValue, setInputValue] = useState("")

	const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && inputValue.trim()) {
			e.preventDefault()
			onActivate(inputValue.trim())
			setInputValue("")
		}
	}, [inputValue, onActivate])

	const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setInputValue(e.target.value)
	}, [])

	const handleButtonClick = useCallback(() => {
		onActivate(inputValue.trim() || undefined);
		setInputValue("")
	}, [inputValue, onActivate])

	return (
		<div className={cn("flex w-full items-center gap-2", className)}>
			<Input
				value={inputValue}
				onChange={handleInputChange}
				onKeyDown={handleKeyDown}
				placeholder={placeholder}
				className="bg-background/80 backdrop-blur-sm"
			/>
		</div>
	)
}
