
"use client"

import React, {
	useState,
	useMemo,
	useEffect,
	useCallback,
	useRef,
	Fragment,
} from "react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
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
import { AIOperationError } from "@/lib/ai-utils"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Syntax: any = SyntaxHighlighter

interface QuizProps {
	quizSet: QuizSet | null
	quizState: QuizState | null
	onQuizStateChange: (newState: QuizState) => void
	language: string
	topic: string;
	currentQuestionIndex: number;
	onCurrentQuestionIndexChange: (index: number) => void;
	apiKey: string;
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
	currentQuestionIndex,
	onCurrentQuestionIndexChange,
	apiKey,
}: QuizProps) {
	
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
				if (!apiKey) {
					throw new AIOperationError('API key is required.', 'API_KEY_REQUIRED');
				}

				const result = await explainQuizOption({
					apiKey,
					topic: quizSet.topic,
					question: currentQuestion.question,
					selectedOption: option,
					correctAnswer: currentQuestion.answer,
					language: language,
				});
	
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
				if (error instanceof AIOperationError && error.code === 'API_KEY_REQUIRED') {
					toast({
						title: "Thiếu API Key",
						description: "Vui lòng nhập API Key Gemini của bạn trong phần Cài đặt.",
						variant: "destructive",
					});
				} else {
					toast({
						title: "Lỗi",
						description: "Không thể lấy giải thích chi tiết. Vui lòng thử lại.",
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
			toast,
			onQuizStateChange,
			apiKey
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
		<div className="h-full flex flex-col bg-transparent shadow-none border-none">
			<div className="flex-grow flex flex-col justify-center items-center overflow-y-auto pb-4">
				{hasContent && currentQuestion ? (
					<div className="w-full max-w-5xl mx-auto space-y-6">
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
										<div className="flex-1 flex items-center gap-4 prose dark:prose-invert max-w-none prose-p:my-0 break-words">
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
												<AlertDescription className="prose dark:prose-invert max-w-none prose-p:my-0 text-base break-words">
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
									"backdrop-blur prose dark:prose-invert max-w-none prose-p:my-1 text-base",
									selectedAnswer === currentQuestion.answer
										? "bg-success/20"
										: "bg-destructive/20"
								)}
							>
								<AlertTitle className="font-bold text-base !my-0">
									{selectedAnswer === currentQuestion.answer
										? "Chính xác!"
										: "Không chính xác."}
								</AlertTitle>
								<AlertDescription className="prose dark:prose-invert max-w-none prose-p:my-0 text-base break-words">
									<MarkdownRenderer>
										{currentQuestion.explanation}
									</MarkdownRenderer>
								</AlertDescription>
							</Alert>
						)}
					</div>
				) : (
					<div className="text-center h-64 flex flex-col items-center justify-center">
						<div className="text-center flex flex-col items-center justify-center">
								<p className="text-muted-foreground mb-4">
									Chưa có câu hỏi trắc nghiệm nào.
								</p>
							</div>
					</div>
				)}
			</div>
		</div>
	)
}
