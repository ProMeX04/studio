
"use client"

import { useState, useRef, useCallback, useEffect }from "react"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader, Send, Sparkles, User, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { askQuestionStream } from "@/ai/flows/ask-question-stream"
import type { ChatMessage } from "@/ai/schemas"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card"
import { ScrollArea } from "./ui/scroll-area"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism"
import { AIOperationError } from "@/lib/ai-utils"

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
				className="min-h-0 resize-none"
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
		let suggestions: string[] = [];
		let responseJson = "";
	
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
	
			// Logic xử lý suggestions sau khi stream kết thúc nếu cần
			// Hiện tại, luồng AI chỉ trả về văn bản
	
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
		<Card className="h-full w-full flex flex-col bg-background/50 backdrop-blur-lg shadow-2xl rounded-none border-l-0 border-r-2 border-y-0 border-border">
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle>Trợ lý AI</CardTitle>
				<Button variant="ghost" size="icon" onClick={() => {
					if (abortControllerRef.current) {
						abortControllerRef.current.abort();
					}
					onClose();
				}}>
					<X className="h-5 w-5" />
				</Button>
			</CardHeader>
			<CardContent className="flex-1 overflow-hidden pt-0">
				<ScrollArea className="h-full w-full pr-4" ref={scrollAreaRef}>
					<div className="space-y-4">
						{messages.length === 0 && !isLoading && (
							<div className="text-center text-muted-foreground pt-10">
								Đặt câu hỏi về chủ đề bạn đang học...
							</div>
						)}
						{messages.map((message, index) => (
							<div
								key={message.id || index}
								className={cn(
									"flex items-start gap-3",
									message.role === "user"
										? "justify-end"
										: "justify-start"
								)}
							>
								{message.role === "model" && (
									<div className="p-2 bg-primary rounded-full text-primary-foreground">
										<Sparkles className="h-5 w-5" />
									</div>
								)}
								<div className="flex-1 space-y-2">
									<div
										className={cn(
											"rounded-lg p-3 max-w-[90%] prose dark:prose-invert prose-p:my-0 prose-headings:my-1",
											message.role === "user"
												? "bg-primary/80 text-primary-foreground float-right"
												: "bg-muted text-muted-foreground",
											{
												"max-w-full":
													message.role === "model",
											}
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
                                                        // This prevents <p> tags from being rendered, which can cause hydration errors
                                                        // when they contain block-level elements.
                                                        return <div {...props} />;
                                                    },
                                                    code({
                                                        node,
                                                        inline,
                                                        className,
                                                        children,
                                                        ...props
                                                    }) {
                                                        const match =
                                                            /language-(\w+)/.exec(
                                                                className || ""
                                                            )
                                                        if (!inline && match) {
                                                            const codeStyle = {
                                                                ...vscDarkPlus,
                                                                'pre[class*="language-"]':
                                                                    {
                                                                        ...vscDarkPlus[
                                                                            'pre[class*="language-"]'
                                                                        ],
                                                                        background:
                                                                            "transparent",
                                                                        padding:
                                                                            "0",
                                                                        margin: "0",
                                                                        fontSize:
                                                                            "16px",
                                                                    },
                                                                'code[class*="language-"]':
                                                                    {
                                                                        ...vscDarkPlus[
                                                                            'code[class*="language-"]'
                                                                        ],
                                                                        background:
                                                                            "transparent",
                                                                        padding:
                                                                            "0",
                                                                        fontSize:
                                                                            "16px",
                                                                    },
                                                            }
                                                            return (
                                                                <SyntaxHighlighter
                                                                    style={
                                                                        codeStyle
                                                                    }
                                                                    language={
                                                                        match[1]
                                                                    }
                                                                    PreTag="div"
                                                                    wrapLongLines={true}
                                                                    {...props}
                                                                >
                                                                    {String(
                                                                        children
                                                                    ).replace(
                                                                        /\n$/,
                                                                        ""
                                                                    )}
                                                                </SyntaxHighlighter>
                                                            )
                                                        }
                                                        return (
                                                            <code
                                                                className={cn(
                                                                    className,
                                                                    "inline-code"
                                                                )}
                                                                {...props}
                                                            >
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
								{message.role === "user" && (
									<div className="p-2 bg-muted rounded-full text-muted-foreground">
										<User className="h-5 w-5" />
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
