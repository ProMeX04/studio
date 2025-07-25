
"use client"

import { useState, useRef, useCallback, useEffect }from "react"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader, Send, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { askQuestionStream } from "@/ai/flows/ask-question-stream"
import type { ChatMessage } from "@/ai/schemas"
import { Card, CardContent, CardFooter } from "./ui/card"
import { ScrollArea } from "./ui/scroll-area"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism"
import { AIOperationError } from "@/lib/ai-utils"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Syntax: any = SyntaxHighlighter


interface ChatAssistantProps {
	context: string;
	initialQuestion?: string;
	onClose: () => void;
}

interface ChatInputFormProps {
	input: string;
	setInput: (value: string) => void;
	handleSubmit: (e: React.FormEvent) => Promise<void>;
	isLoading: boolean;
	className?: string;
}

function ChatInputForm({
	input,
	setInput,
	handleSubmit,
	isLoading,
	className,
}: ChatInputFormProps) {
	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault()
			handleSubmit(e)
		}
	}

	return (
		<form
			onSubmit={handleSubmit}
			className={cn("flex w-full items-center gap-2", className)}
		>
			<Textarea
				value={input}
				onChange={(e) => setInput(e.target.value)}
				placeholder="Hỏi AI về nội dung bạn đang xem..."
				className="min-h-0 resize-none md:text-sm"
				rows={1}
				disabled={isLoading}
				onKeyDown={handleKeyDown}
			/>
			<Button
				type="submit"
				size="icon"
				disabled={isLoading || !input.trim()}
			>
				{isLoading ? <Loader className="animate-spin" /> : <Send />}
			</Button>
		</form>
	)
}


export function ChatAssistant({ context, initialQuestion, onClose }: ChatAssistantProps) {
	const [messages, setMessages] = useState<ChatMessage[]>([])
	const [input, setInput] = useState("")
	const [isLoading, setIsLoading] = useState(false)
	const { toast } = useToast()
	const scrollAreaRef = useRef<HTMLDivElement>(null)
	const abortControllerRef = useRef<AbortController | null>(null)

	const scrollToBottom = useCallback(() => {
		setTimeout(() => {
			if (scrollAreaRef.current) {
				const viewport = scrollAreaRef.current.querySelector("div")
				if (viewport) {
					viewport.scrollTop = viewport.scrollHeight
				}
			}
		}, 100);
	}, [])

	useEffect(() => {
		scrollToBottom()
	}, [messages, scrollToBottom])
	
	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if(abortControllerRef.current) {
				abortControllerRef.current.abort();
			}
		}
	}, [])

	const processStream = useCallback(async (stream: ReadableStream<string>, assistantMessageId: string) => {
		const reader = stream.getReader();
		let accumulatedResponse = "";
	
		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
	
				accumulatedResponse += value;
	
				// Cập nhật giao diện với văn bản đang stream
				setMessages(prev => prev.map(msg => 
					msg.id === assistantMessageId 
					? { ...msg, text: accumulatedResponse } 
					: msg
				));
			}
	
		} catch (error) {
			console.error("Error processing stream:", error);
			setMessages(prev => prev.map(msg => 
				msg.id === assistantMessageId 
				? { ...msg, text: "Xin lỗi, đã có lỗi xảy ra khi xử lý phản hồi." } 
				: msg
			));
		}
	}, []);


	const handleSubmit = useCallback(async (e: React.FormEvent, question?: string) => {
		e.preventDefault();
		const questionToSend = question || input;
		if (!questionToSend.trim() || isLoading) return;
	
		setIsLoading(true);
		setInput("");
	
		// Add user message
		const userMessage: ChatMessage = { id: Date.now().toString(), role: "user", text: questionToSend };
		
		// Add empty assistant message
		const assistantMessageId = (Date.now() + 1).toString();
		const assistantMessage: ChatMessage = { id: assistantMessageId, role: 'model', text: '' };

		setMessages(prev => {
			const newMessages = [...prev];
			const lastMessage = newMessages[newMessages.length - 1];
			if (lastMessage?.role === 'model') {
				delete lastMessage.suggestions;
			}
			return [...newMessages, userMessage, assistantMessage];
		});

		abortControllerRef.current = new AbortController();
	
		try {
			// askQuestionStream giờ trả về ReadableStream<string>
			const stream = await askQuestionStream({
				context,
				question: questionToSend,
				history: messages,
			});
	
			await processStream(stream, assistantMessageId);
	
		} catch (error) {
			console.error("Error asking question:", error);
			const errorMessage = error instanceof AIOperationError && error.code === 'ABORTED'
				? "Yêu cầu đã được hủy."
				: "Không thể nhận câu trả lời từ AI. Vui lòng thử lại.";

			setMessages(prev => prev.map(msg => 
				msg.id === assistantMessageId 
				? { ...msg, text: errorMessage } 
				: msg
			));
			
			toast({
				title: "Lỗi",
				description: errorMessage,
				variant: "destructive",
			});
		} finally {
			setIsLoading(false);
			abortControllerRef.current = null;
		}
	}, [input, isLoading, context, messages, toast, processStream]);
	

	useEffect(() => {
		if (initialQuestion) {
			const dummyEvent = { preventDefault: () => {} } as React.FormEvent;
			handleSubmit(dummyEvent, initialQuestion);
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [initialQuestion]);


	return (
		<Card className="h-full w-full flex flex-col bg-background/50 backdrop-blur-lg shadow-2xl rounded-2xl border max-h-[90vh]">
			<CardContent className="flex-1 overflow-hidden pt-4 relative">
        <Button variant="ghost" size="icon" className="absolute top-2 right-2 z-10" onClick={() => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            onClose();
        }}>
            <X className="h-5 w-5" />
        </Button>
				<ScrollArea className="h-full w-full pr-4" ref={scrollAreaRef}>
					<div className="space-y-4">
						{messages.length === 0 && !isLoading && (
							<div className="text-center text-muted-foreground pt-10">
								Đặt câu hỏi về chủ đề bạn đang học...
							</div>
						)}
						{messages.map((message, index) => (
							<div key={message.id || index} className="w-full">
								{message.role === 'user' ? (
									<div className="flex justify-end">
										<div className="rounded-lg p-3 bg-primary/80 text-primary-foreground prose dark:prose-invert prose-p:my-0 prose-headings:my-1">
											{message.text}
										</div>
									</div>
								) : (
									<div className="space-y-2">
										<div
											className={cn(
												"prose dark:prose-invert prose-p:my-0 prose-headings:my-1 w-full"
											)}
										>
											{message.text ? (
												<ReactMarkdown
													remarkPlugins={[
														remarkGfm,
														remarkMath,
													]}
													rehypePlugins={[rehypeKatex]}
													components={{
														p: ({ node, ...props }) => {
															return <p {...props} className="break-words" />;
														},
														pre({ node, ...props }) {
															return <pre {...props} className="w-full bg-black/80 text-white p-2 rounded-md my-2 overflow-x-auto" />;
														},
														code({
															node,
															inline,
															className,
															children,
															...props
														}) {
															const match = /language-(\w+)/.exec(className || "");
															if (!inline && match) {
																return (
																	<pre className="overflow-x-auto bg-black/80 p-2 rounded-md my-2 w-full">
																		<Syntax
																			style={vscDarkPlus}
																			language={match[1]}
																			PreTag="div"
																			{...props}
																		>
																			{String(children).replace(/\n$/, '')}
																		</Syntax>
																	</pre>
																);
															}
															if (inline) {
																return (
																	<code
																		className={cn(className, "inline-code")}
																		{...props}
																	>
																		{children}
																	</code>
																);
															}
															// Fallback for code blocks without a language
															return (
																<code className={cn(className, "block whitespace-pre-wrap p-2 bg-muted rounded-md")} {...props}>
																	{children}
																</code>
															)
														},
													}}
												>
													{message.text}
												</ReactMarkdown>
											) : (
											   <Loader className="animate-spin text-muted-foreground" />
											)}
										</div>
										{message.role === "model" &&
											!isLoading &&
											message.suggestions &&
											message.suggestions.length > 0 && (
												<div className="flex flex-wrap gap-2 pt-2">
													{message.suggestions.map(
														(suggestion, i) => (
															<Button
																key={i}
																variant="outline"
																size="sm"
																onClick={(e) =>
																	handleSubmit(
																		e,
																		suggestion
																	)
																}
																className="bg-background/50 backdrop-blur"
															>
																{suggestion}
															</Button>
														)
													)}
												</div>
											)}
									</div>
								)}
							</div>
						))}
					</div>
				</ScrollArea>
			</CardContent>
			<CardFooter>
				<ChatInputForm 
					input={input}
					setInput={setInput}
					handleSubmit={handleSubmit}
					isLoading={isLoading}
				/>
			</CardFooter>
		</Card>
	)
}
