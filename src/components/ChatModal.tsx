"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader, Send, X } from "lucide-react"
import { cn } from "@/lib/utils"
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
	const scrollAreaRef = useRef<HTMLDivElement>(null)
	const abortControllerRef = useRef<AbortController | null>(null)

	const scrollToBottom = () => {
		if (scrollAreaRef.current) {
			const viewport = scrollAreaRef.current.querySelector("div")
			if (viewport) {
				viewport.scrollTop = viewport.scrollHeight
			}
		}
	}
	
	useEffect(() => {
		scrollToBottom()
	}, [messages])

	const handleClose = () => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort()
		}
		onClose()
	}

	const processStream = async (stream: ReadableStream<string>, assistantMessageId: string) => {
		const reader = stream.getReader()
		const decoder = new TextDecoder()
		let accumulatedText = ""
		
		while (true) {
			try {
				const { done, value } = await reader.read()
				if (done) break
				
				accumulatedText += decoder.decode(value, { stream: true })
				setMessages(prev =>
					prev.map(msg =>
						msg.id === assistantMessageId
							? { ...msg, content: accumulatedText }
							: msg
					)
				)
			} catch (error) {
				console.error("Stream reading error:", error)
				toast({
					title: "Lỗi Stream",
					description: "Đã xảy ra lỗi khi đọc phản hồi từ AI.",
					variant: "destructive",
				})
				break
			}
		}
	}

	const submitQuery = useCallback(async (question: string, history: Message[]) => {
		setIsLoading(true)

		const userMessage: Message = {
			id: `user-${Date.now()}`,
			role: "user",
			content: question,
		}
		
		const assistantMessageId = `assistant-${Date.now()}`
		const assistantMessage: Message = {
			id: assistantMessageId,
			role: "assistant",
			content: "",
		}
		
		setMessages([...history, userMessage, assistantMessage])

		try {
			const chatHistory: ChatMessage[] = [...history, userMessage].map(msg => ({
				role: msg.role === "assistant" ? "model" : "user",
				text: msg.content,
			}))

			const stream = await askQuestionStream({
				context,
				question,
				history: chatHistory,
			})
			
			await processStream(stream, assistantMessageId)

		} catch (error: any) {
			console.error("❌ Chat modal error:", error)
			setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId))
			toast({
				title: "Lỗi",
				description: "Không thể gửi câu hỏi. Vui lòng thử lại.",
				variant: "destructive",
			})
		} finally {
			setIsLoading(false)
		}
	}, [context, toast])
	
	useEffect(() => {
		if (isOpen) {
			setMessages([])
			if (initialQuestion) {
				submitQuery(initialQuestion, [])
			}
		}
	}, [isOpen, initialQuestion, submitQuery])


	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!input.trim() || isLoading) return
		const currentInput = input.trim()
		setInput("")
		await submitQuery(currentInput, messages)
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault()
			handleSubmit(e)
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
			<DialogContent className="sm:max-w-4xl max-h-[80vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>
						Hỏi AI về nội dung hiện tại
					</DialogDescription>
				</DialogHeader>

				<ScrollArea className="flex-1 min-h-[400px] max-h-[400px] pr-4" ref={scrollAreaRef}>
					<div className="space-y-4">
						{messages.length === 0 && !isLoading && (
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
										{isLoading && message.content === "" && (
											<div className="flex items-center gap-2">
												<Loader className="h-4 w-4 animate-spin" />
												<span>AI đang suy nghĩ...</span>
											</div>
										)}
									</div>
								) : (
									<p>{message.content}</p>
								)}
							</div>
						))}
					</div>
				</ScrollArea>

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
