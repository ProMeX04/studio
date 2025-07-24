
"use client"

import {
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Syntax: any = SyntaxHighlighter

interface QuizProps {
	quizSet: QuizSet | null
	initialState: QuizState | null
	onStateChange: (newState: QuizState) => void
	onGenerateMore: () => void
	canGenerateMore: boolean
	isLoading: boolean
	onViewChange: (view: "flashcards" | "quiz") => void
	currentView: "flashcards" | "quiz"
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
				p: (props: any) => {
					const hasDiv = Array.isArray(props.children) && props.children.some(
						(child: any) =>
							child &&
							typeof child === "object" &&
							"type" in child &&
							child.type === "div"
					);

					if (hasDiv) {
						return <div>{props.children}</div>
					}
					return <p>{props.children}</p>
				},
				code({ node, inline, className, children, ...props }) {
					const match = /language-(\w+)/.exec(className || "")
					if (inline) {
						return (
							<code
								className={cn(className, "inline-code")}
								{...props}
							>
								{children}
							</code>
						)
					}
					// Handle non-inline code
					return (
						<div>
							<Syntax
								style={codeStyle as any}
								language={match ? match[1] : "text"}
								PreTag="div"
								wrapLongLines={true}
								{...props}
							>
								{String(children).replace(/\n$/, "")}
							</Syntax>
						</div>
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
	initialState,
	onStateChange,
	onGenerateMore,
	canGenerateMore,
	isLoading,
	onViewChange,
	currentView,
}: QuizProps) {
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(
		initialState?.currentQuestionIndex || 0
	)
	const [answers, setAnswers] = useState<AnswerState>(
		initialState?.answers || {}
	)
	const [isExplaining, setIsExplaining] = useState<string | null>(null) // Option being explained
	const { toast } = useToast()

	const currentAnswerState = answers[currentQuestionIndex] || {
		selected: null,
		isAnswered: false,
		explanations: {},
	}
	const { selected: selectedAnswer, isAnswered } = currentAnswerState

	// Update state only when initialState changes, not when quizSet changes.
	// This prevents jumping to the first question when new questions are loaded in the background.
	useEffect(() => {
		if (initialState) {
			setCurrentQuestionIndex(initialState.currentQuestionIndex)
			setAnswers(initialState.answers)
		}
	}, [initialState])

	// Reset component state if the quizSet is removed.
	useEffect(() => {
		if (!quizSet) {
			setCurrentQuestionIndex(0)
			setAnswers({})
		}
	}, [quizSet])

	useEffect(() => {
		if (quizSet) {
			// Only call onStateChange if there is a quizSet to avoid writing null state
			onStateChange({ currentQuestionIndex, answers })
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentQuestionIndex, answers])

	const currentQuestion = useMemo(
		() => quizSet?.questions[currentQuestionIndex],
		[quizSet, currentQuestionIndex]
	)
	const hasContent =
		quizSet && quizSet.questions && quizSet.questions.length > 0

	const handleNextQuestion = () => {
		if (quizSet && currentQuestionIndex < quizSet.questions.length - 1) {
			setCurrentQuestionIndex(currentQuestionIndex + 1)
		}
	}

	const handlePrevQuestion = () => {
		if (currentQuestionIndex > 0) {
			setCurrentQuestionIndex(currentQuestionIndex - 1)
		}
	}

	const handleAnswerSelect = (answer: string) => {
		if (isAnswered) return
		setAnswers({
			...answers,
			[currentQuestionIndex]: {
				...currentAnswerState,
				selected: answer,
				isAnswered: true,
			},
		})
	}

	const handleExplain = useCallback(
		async (option: string) => {
			if (!quizSet || !currentQuestion) return

			// Do not fetch again if explanation already exists
			if (currentAnswerState.explanations?.[option]) {
				return
			}

			setIsExplaining(option)
			try {
				const result = await explainQuizOption({
					topic: quizSet.topic,
					question: currentQuestion.question,
					selectedOption: option,
					correctAnswer: currentQuestion.answer,
				})

				const newExplanations = {
					...(currentAnswerState.explanations || {}),
					[option]: result,
				}
				setAnswers((prev) => ({
					...prev,
					[currentQuestionIndex]: {
						...prev[currentQuestionIndex],
						explanations: newExplanations,
					},
				}))
			} catch (error) {
				console.error("Failed to get explanation", error)
				toast({
					title: "Lỗi",
					description:
						"Không thể lấy giải thích chi tiết. Vui lòng thử lại.",
					variant: "destructive",
				})
			} finally {
				setIsExplaining(null)
			}
		},
		[
			quizSet,
			currentQuestion,
			currentAnswerState,
			currentQuestionIndex,
			toast,
		]
	)

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
		<Card className="h-full flex flex-col bg-transparent shadow-none border-none">
			<CardContent className="flex-grow flex flex-col justify-center items-center pt-8">
				{hasContent && currentQuestion ? (
					<div className="w-full max-w-5xl mx-auto space-y-6">
						<div className="text-2xl font-semibold bg-background/50 backdrop-blur rounded-lg p-6 prose dark:prose-invert max-w-none prose-p:my-0 prose-code:text-left">
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
											"w-full flex items-center justify-between gap-4 p-4 rounded-lg border transition-colors text-lg",
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
												handleExplain(option)
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
									] && (
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
						{!isLoading && (
							<div className="text-center flex flex-col items-center justify-center">
								<p className="text-muted-foreground mb-4">
									Chưa có câu hỏi trắc nghiệm nào.
								</p>
							</div>
						)}
					</div>
				)}
			</CardContent>
			<CardFooter className="flex-col !pt-0 gap-2 items-center">
				{(!hasContent && !isLoading) && (
					<Button onClick={onGenerateMore} size="lg" className="mb-4">
						<Plus className="mr-2" /> Tạo Bài trắc nghiệm
					</Button>
				)}
				<div className="inline-flex items-center justify-center bg-background/30 backdrop-blur-sm p-2 rounded-md">
					<div className="flex items-center justify-center w-full gap-4">
						<Button
							onClick={handlePrevQuestion}
							disabled={currentQuestionIndex === 0 || !hasContent}
							variant="outline"
							size="icon"
						>
							<ChevronLeft />
						</Button>
						<Select
							value={currentView}
							onValueChange={(value) =>
								onViewChange(value as "flashcards" | "quiz")
							}
						>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder="Chọn chế độ" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="flashcards">
									Flashcard
								</SelectItem>
								<SelectItem value="quiz">Trắc nghiệm</SelectItem>
							</SelectContent>
						</Select>
						<Button
							onClick={handleNextQuestion}
							disabled={
								!hasContent ||
								currentQuestionIndex ===
									(quizSet?.questions.length ?? 0) - 1
							}
							variant="outline"
							size="icon"
						>
							<ChevronRight />
						</Button>
						{hasContent && (
							<Button
								onClick={onGenerateMore}
								disabled={isLoading || !canGenerateMore}
								variant="outline"
								size="icon"
								className="ml-2"
							>
								{isLoading ? (
									<Loader className="animate-spin" />
								) : (
									<Plus />
								)}
							</Button>
						)}
					</div>
				</div>
				<p className="text-center text-sm text-muted-foreground w-28">
					Câu hỏi {hasContent ? currentQuestionIndex + 1 : 0} /{" "}
					{quizSet?.questions.length ?? 0}
				</p>
			</CardFooter>
		</Card>
	)
}
