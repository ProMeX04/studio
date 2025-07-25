"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader, Send, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { askQuestion } from "@/ai/flows/ask-question"
import { askQuestionStream } from "@/ai/flows/ask-question-stream"
import { type ChatMessage } from "@/ai/schemas"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog"
import { ScrollArea } from "./ui/scroll-area"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface ChatModalProps {
	isOpen: boolean
	onClose: () => void
	context: string
	title?: string
	initialQuestion?: string
}

interface Message {
	id: string
	role: "user" | "assistant"
	content: string
	timestamp: Date
}

export function ChatModal({ 
	isOpen, 
	onClose, 
	context, 
	title = "Chat với AI",
	initialQuestion
}: ChatModalProps) {
	const [input, setInput] = useState("")
	const [isLoading, setIsLoading] = useState(false)
	const [messages, setMessages] = useState<Message[]>([])
	const { toast } = useToast()

	// Reset messages when modal opens with new context
	useEffect(() => {
		if (isOpen) {
			setMessages([])
			// Auto-submit initial question if provided
			if (initialQuestion && initialQuestion.trim()) {
				handleInitialQuestion(initialQuestion.trim())
			}
		}
	}, [isOpen, context, initialQuestion])

	const handleInitialQuestion = useCallback(async (question: string) => {
		const userMessage: Message = {
			id: Date.now().toString(),
			role: "user",
			content: question,
			timestamp: new Date(),
		}

		const assistantMessage: Message = {
			id: (Date.now() + 1).toString(),
			role: "assistant",
			content: "",
			timestamp: new Date(),
		}

		setMessages([userMessage, assistantMessage])
		setIsLoading(true)

		try {
			const stream = await askQuestionStream({
				context,
				question,
				history: [],
			})

			const reader = stream.getReader()
			let accumulatedText = ""

			while (true) {
				const { done, value } = await reader.read()
				if (done) break

				// Accumulate text to reduce update frequency
				accumulatedText += value
				
				setMessages(prev => {
					const updated = [...prev]
					const lastMessage = updated[updated.length - 1]
					if (lastMessage && lastMessage.role === "assistant") {
						lastMessage.content = accumulatedText
					}
					return updated
				})
				
				// Add small delay to prevent overwhelming the UI
				await new Promise(resolve => setTimeout(resolve, 50))
			}

		} catch (error: any) {
			console.error("❌ Initial question error:", error)
			toast({
				title: "Lỗi",
				description: "Không thể gửi câu hỏi. Vui lòng thử lại.",
				variant: "destructive",
			})
		} finally {
			setIsLoading(false)
		}
	}, [context, toast])

	const handleSubmit = useCallback(async (e: React.FormEvent) => {
		e.preventDefault()
		if (!input.trim() || isLoading) return

		const userMessage: Message = {
			id: Date.now().toString(),
			role: "user",
			content: input.trim(),
			timestamp: new Date(),
		}

		const assistantMessage: Message = {
			id: (Date.now() + 1).toString(),
			role: "assistant",
			content: "",
			timestamp: new Date(),
		}

		setMessages(prev => [...prev, userMessage, assistantMessage])
		setInput("")
		setIsLoading(true)

		try {
			const chatHistory: ChatMessage[] = messages.map(msg => ({
				role: msg.role === "assistant" ? "model" : "user",
				text: msg.content,
			}))

			const stream = await askQuestionStream({
				context,
				question: userMessage.content,
				history: chatHistory,
			})

			const reader = stream.getReader()
			let accumulatedText = ""

			while (true) {
				const { done, value } = await reader.read()
				if (done) break

				// Accumulate text to reduce update frequency
				accumulatedText += value
				
				setMessages(prev => {
					const updated = [...prev]
					const lastMessage = updated[updated.length - 1]
					if (lastMessage && lastMessage.role === "assistant") {
						lastMessage.content = accumulatedText
					}
					return updated
				})
				
				// Add small delay to prevent overwhelming the UI
				await new Promise(resolve => setTimeout(resolve, 50))
			}

		} catch (error: any) {
			console.error("❌ Chat modal error:", error)
			toast({
				title: "Lỗi",
				description: "Không thể gửi câu hỏi. Vui lòng thử lại.",
				variant: "destructive",
			})
		} finally {
			setIsLoading(false)
		}
	}, [input, isLoading, context, messages, toast])

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault()
			handleSubmit(e)
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-4xl max-h-[80vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>
						Hỏi AI về nội dung hiện tại
					</DialogDescription>
				</DialogHeader>

				{/* Messages Area */}
				<ScrollArea className="flex-1 min-h-[400px] max-h-[400px] pr-4">
					<div className="space-y-4">
						{messages.length === 0 && (
							<div className="text-center text-muted-foreground py-8">
								Bắt đầu cuộc trò chuyện bằng cách đặt câu hỏi...
							</div>
						)}
						{messages.map((message) => (
							<div
								key={message.id}
								className={cn(
									"flex w-max max-w-[85%] flex-col gap-2 rounded-lg px-3 py-2 text-sm",
									message.role === "user"
										? "ml-auto bg-primary text-primary-foreground"
										: "bg-muted"
								)}
							>
								{message.role === "assistant" ? (
									<div className="prose prose-sm dark:prose-invert max-w-none">
										<ReactMarkdown remarkPlugins={[remarkGfm]}>
											{message.content}
										</ReactMarkdown>
									</div>
								) : (
									<p>{message.content}</p>
								)}
								<time className="text-xs opacity-50">
									{message.timestamp.toLocaleTimeString()}
								</time>
							</div>
						))}
						{isLoading && (
							<div className="flex w-max max-w-[85%] flex-col gap-2 rounded-lg px-3 py-2 text-sm bg-muted">
								<div className="flex items-center gap-2">
									<Loader className="h-4 w-4 animate-spin" />
									<span>AI đang suy nghĩ...</span>
								</div>
							</div>
						)}
					</div>
				</ScrollArea>

				{/* Input Area */}
				<form
					onSubmit={handleSubmit}
					className="flex w-full items-center gap-2 pt-4 border-t"
				>
					<Textarea
						value={input}
						onChange={(e) => setInput(e.target.value)}
						placeholder="Nhập câu hỏi của bạn..."
						className="min-h-0 resize-none"
						rows={1}
						disabled={isLoading}
						onKeyDown={handleKeyDown}
					/>
					<Button
						type="submit"
						size="icon"
						disabled={isLoading || !input.trim()}
						className="flex-shrink-0"
					>
						{isLoading ? <Loader className="animate-spin" /> : <Send />}
					</Button>
				</form>
			</DialogContent>
		</Dialog>
	)
}
