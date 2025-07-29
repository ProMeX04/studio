
"use client"

import React, {
	useState,
	useMemo,
	useEffect,
	useCallback,
	useRef,
	Fragment,
} from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { RadioGroup, RadioGroupItem } from "./ui/radio-group"
import { Label } from "./ui/label"
import {
	ChevronLeft,
	ChevronRight,
	HelpCircle,
	Loader,
	Plus,
	BookOpen,
	Menu,
} from "lucide-react"
import { explainQuizOption } from "@/ai/flows/explain-quiz-option"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"
import type {
	QuizQuestion,
	QuizSet,
	ExplainQuizOptionOutput,
} from "@/ai/schemas"
import type { QuizState, AnswerState } from "@/app/types"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism"
import { QuizSummary } from "./QuizSummary"
import { AIError } from "@/lib/ai-service"
import { ScrollArea } from "./ui/scroll-area"
import { useAppContext } from "@/contexts/AppContext"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Syntax: any = SyntaxHighlighter

interface QuizProps {
	quizSet: QuizSet | null
	quizState: QuizState | null
	onQuizStateChange: (newState: QuizState) => void
	language: string
	topic: string;
	model: string;
	currentQuestionIndex: number;
	onCurrentQuestionIndexChange: (index: number) => void;
	apiKeys: string[];
	apiKeyIndex: number;
	onApiKeyIndexChange: (index: number) => void;
}

const MarkdownRenderer = ({ children }: { children: string }) => {
	const codeStyle = {
		...vscDarkPlus,
		'pre[class*="language-"]': {
			...vscDarkPlus['pre[class*="language-"]'],
			background: "transparent",
			padding: "0",
			margin: "0",
			fontSize: "16px",
		},
		'code[class*="language-"]': {
			...vscDarkPlus['code[class*="language-"]'],
			background: "transparent",
			padding: "0",
			fontSize: "16px",
		},
	}

	return (
		<ReactMarkdown
			remarkPlugins={[remarkGfm, remarkMath]}
			rehypePlugins={[rehypeKatex]}
			components={{
				p: (props: any) => <p {...props} className="markdown-paragraph" />,
				pre: ({ node, ...props }) => (
					<pre {...props} className="w-full overflow-x-auto" />
				),
				code({ node, inline, className, children, ...props }: any) {
					const match = /language-(\w+)/.exec(className || "")
					if (!inline && match) {
						return (
							<Syntax
								style={codeStyle as any}
								language={match ? match[1] : "text"}
								PreTag="pre"
								{...props}
							>
								{String(children).replace(/\n$/, "")}
							</Syntax>
						)
					}
					// Handle inline code
					return (
						<code className={cn(className, 'inline-code')} {...props}>
							{children}
						</code>
					)
				},
			}}
		>
			{children}
		</ReactMarkdown>
	)
}

export function Quiz({
	quizSet,
	quizState,
	onQuizStateChange,
	language,
	topic,
	model,
	currentQuestionIndex,
	onCurrentQuestionIndexChange,
	apiKeys,
	apiKeyIndex,
	onApiKeyIndexChange,
}: QuizProps) {
	const { handleGenerate, isLoading } = useAppContext();
	
	const [isExplaining, setIsExplaining] = useState<string | null>(null) // Option being explained
	const [visibleExplanations, setVisibleExplanations] = useState<
		Set<string>
	>(new Set()) // Track which explanations are visible
	const { toast } = useToast()

	const currentAnswerState = quizState?.answers[currentQuestionIndex] || {
		selected: null,
		isAnswered: false,
		explanations: {},
	}
	const { selected: selectedAnswer, isAnswered } = currentAnswerState

	useEffect(() => {
		if (!quizSet) {
			setVisibleExplanations(new Set())
		}
	}, [quizSet])
	
	// Reset explanation visibility when question changes
	useEffect(() => {
		setVisibleExplanations(new Set());
	}, [currentQuestionIndex]);


	const currentQuestion = useMemo(
		() => quizSet?.questions[currentQuestionIndex],
		[quizSet, currentQuestionIndex]
	)
	const hasContent =
		quizSet && quizSet.questions && quizSet.questions.length > 0

	const handleAnswerSelect = (answer: string) => {
		if (isAnswered || !quizState) return
		
		const newState: QuizState = {
			...quizState,
			answers: {
				...quizState.answers,
				[currentQuestionIndex]: {
					...currentAnswerState,
					selected: answer,
					isAnswered: true,
				},
			}
		};
		onQuizStateChange(newState);
	}

	const handleOptionExplanation = useCallback(
		async (option: string) => {
			if (!quizSet || !currentQuestion || !quizState) return;
	
			const explanationKey = `${currentQuestionIndex}-${option}`;
	
			if (visibleExplanations.has(explanationKey)) {
				setVisibleExplanations((prev) => {
					const newSet = new Set(prev);
					newSet.delete(explanationKey);
					return newSet;
				});
				return;
			}
	
			if (currentAnswerState.explanations?.[option]) {
				setVisibleExplanations((prev) => new Set(prev).add(explanationKey));
				return;
			}
	
			setIsExplaining(option);
	
			try {
				if (!apiKeys || apiKeys.length === 0) {
					throw new AIError('API key is required.', 'API_KEY_REQUIRED');
				}
				
				const { result, newApiKeyIndex } = await explainQuizOption({
					apiKeys,
					apiKeyIndex,
					topic: quizSet.topic,
					question: currentQuestion.question,
					selectedOption: option,
					correctAnswer: currentQuestion.answer,
					language: language,
					model: model,
				});

				onApiKeyIndexChange(newApiKeyIndex);
	
				if (result?.explanation) {
					const newState: QuizState = {
						...quizState,
						answers: {
							...quizState.answers,
							[currentQuestionIndex]: {
								...currentAnswerState,
								explanations: {
									...(currentAnswerState.explanations || {}),
									[option]: result,
								},
							},
						}
					};
					onQuizStateChange(newState);
					setVisibleExplanations((prev) => new Set(prev).add(explanationKey));
				} else {
					throw new Error("Empty explanation received");
				}
			} catch (error: any) {
				console.error("Failed to get explanation", error);
				if (error instanceof AIError) {
					toast({
						title: "Lỗi lấy giải thích",
						description: error.message,
						variant: "destructive",
					});
				} else {
					toast({
						title: "Lỗi không xác định",
						description: `Không thể lấy giải thích chi tiết: ${error.message}`,
						variant: "destructive",
					});
				}
			} finally {
				setIsExplaining(null);
			}
		},
		[
			quizSet,
			quizState,
			currentQuestion,
			currentAnswerState,
			currentQuestionIndex,
			visibleExplanations,
			language,
			model,
			toast,
			onQuizStateChange,
			apiKeys,
			apiKeyIndex,
			onApiKeyIndexChange
		]
	);

	const getOptionClass = (option: string) => {
		if (!isAnswered)
			return "border-border cursor-pointer hover:bg-accent/50 bg-background/80 backdrop-blur-sm"

		const isCorrect = option === currentQuestion?.answer
		const isSelectedWrong =
			option === selectedAnswer &&
			selectedAnswer !== currentQuestion?.answer

		if (isCorrect) return "bg-success/80 border-success backdrop-blur-sm"
		if (isSelectedWrong)
			return "bg-destructive/50 border-destructive backdrop-blur-sm"
		return "border-border bg-background/80 backdrop-blur-sm"
	}

	return (
		<div className="h-full flex flex-col items-center justify-center">
			{hasContent && currentQuestion ? (
				<ScrollArea className="h-full w-full pr-4">
					<div className="w-full max-w-5xl mx-auto space-y-6 py-4">
						<div className="text-3xl font-semibold bg-background/50 backdrop-blur rounded-lg p-6 prose dark:prose-invert max-w-none prose-p:my-0 prose-code:text-left">
							<MarkdownRenderer>
								{currentQuestion.question}
							</MarkdownRenderer>
						</div>
						<RadioGroup
							value={selectedAnswer ?? ""}
							onValueChange={handleAnswerSelect}
							disabled={isAnswered}
							className="space-y-3"
						>
							{currentQuestion.options.map((option, index) => (
								<div key={index} className="space-y-2">
									<Label
										htmlFor={`option-${index}`}
										className={cn(
											"w-full flex items-center justify-between gap-4 p-5 rounded-lg border transition-colors text-xl",
											getOptionClass(option)
										)}
									>
										<div className="flex-1 flex items-center gap-4 prose dark:prose-invert max-w-none prose-p:my-0 break-words text-xl">
											<RadioGroupItem
												value={option}
												id={`option-${index}`}
											/>
											<MarkdownRenderer>
												{option}
											</MarkdownRenderer>
										</div>
										<Button
											size="icon"
											variant="ghost"
											onClick={(e) => {
												e.preventDefault()
												handleOptionExplanation(option)
											}}
											disabled={isExplaining !== null}
											className={cn(
												"shrink-0 transition-opacity",
												!isAnswered &&
													"opacity-0 pointer-events-none"
											)}
										>
											{isExplaining === option ? (
												<Loader className="animate-spin" />
											) : (
												<HelpCircle />
											)}
										</Button>
									</Label>

									{currentAnswerState.explanations?.[
										option
									] &&
										visibleExplanations.has(
											`${currentQuestionIndex}-${option}`
										) && (
											<Alert
												variant="default"
												className="bg-secondary/20 backdrop-blur"
											>
												<HelpCircle className="h-4 w-4" />
												<AlertTitle>
													Giải thích chi tiết
												</AlertTitle>
												<AlertDescription className="prose dark:prose-invert max-w-none prose-p:my-0 text-lg break-words">
													<MarkdownRenderer>
														{
															currentAnswerState
																.explanations[
																option
															].explanation
														}
													</MarkdownRenderer>
												</AlertDescription>
											</Alert>
										)}
								</div>
							))}
						</RadioGroup>
						{isAnswered && (
							<Alert
								className={cn(
									"backdrop-blur prose dark:prose-invert max-w-none prose-p:my-1 text-lg",
									selectedAnswer === currentQuestion.answer
										? "bg-success/20"
										: "bg-destructive/20"
								)}
							>
								<AlertTitle className="font-bold text-lg !my-0">
									{selectedAnswer === currentQuestion.answer
										? "Chính xác!"
										: "Không chính xác."}
								</AlertTitle>
								<AlertDescription className="prose dark:prose-invert max-w-none prose-p:my-0 text-lg break-words">
									<MarkdownRenderer>
										{currentQuestion.explanation}
									</MarkdownRenderer>
								</AlertDescription>
							</Alert>
						)}
					</div>
				</ScrollArea>
			) : (
				<Card className="w-full max-w-lg text-center bg-background/80 backdrop-blur-sm">
					<CardHeader>
						<div className="mx-auto bg-primary/10 p-4 rounded-full">
							<HelpCircle className="w-12 h-12 text-primary" />
						</div>
						<CardTitle className="mt-4 text-2xl">Kiểm tra kiến thức về "{topic}"</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground mb-4">
							AI sẽ tạo một bài trắc nghiệm đầy đủ dựa trên chủ đề bạn đã chọn.
						</p>
						<Button onClick={() => handleGenerate(true)} disabled={isLoading}>
							{isLoading ? (
								<Loader className="animate-spin mr-2 h-4 w-4" />
							) : (
								<Plus className="mr-2 h-4 w-4" />
							)}
							{isLoading ? "Đang tạo..." : "Bắt đầu học"}
						</Button>
					</CardContent>
				</Card>
			)}
		</div>
	)
}
