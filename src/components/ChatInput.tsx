"use client"

import { useState, useCallback } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { ChatModal } from "./ChatModal"

interface ChatInputProps {
	context: string
	className?: string
	placeholder?: string
	title?: string
}

export function ChatInput({ 
	context, 
	className, 
	placeholder = "Hỏi AI về nội dung này...",
	title
}: ChatInputProps) {
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [inputValue, setInputValue] = useState("")
	const [initialQuestion, setInitialQuestion] = useState("")

	const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && inputValue.trim()) {
			e.preventDefault()
			setInitialQuestion(inputValue.trim())
			setInputValue("")
			setIsModalOpen(true)
		}
	}, [inputValue])

	const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setInputValue(e.target.value)
	}, [])

	const handleButtonClick = useCallback(() => {
		if (inputValue.trim()) {
			setInitialQuestion(inputValue.trim())
			setInputValue("")
		} else {
			setInitialQuestion("")
		}
		setIsModalOpen(true)
	}, [inputValue])

	const handleModalClose = useCallback(() => {
		setIsModalOpen(false)
		setInitialQuestion("")
	}, [])

	return (
		<>
			<div className={cn("flex w-full items-center gap-2", className)}>
				<Input
					value={inputValue}
					onChange={handleInputChange}
					onKeyDown={handleKeyDown}
					placeholder={placeholder}
					className="bg-background/80 backdrop-blur-sm"
				/>
				<Button
					size="icon"
					onClick={handleButtonClick}
					className="flex-shrink-0"
				>
					<MessageSquare />
				</Button>
			</div>

			<ChatModal
				isOpen={isModalOpen}
				onClose={handleModalClose}
				context={context}
				title={title}
				initialQuestion={initialQuestion}
			/>
		</>
	)
}
