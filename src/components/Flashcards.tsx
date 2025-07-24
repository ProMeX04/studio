
"use client"

import {
	useState,
	useEffect,
	useCallback,
	Fragment,
	ReactNode,
	useRef,
} from "react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Button } from "./ui/button"
import { ChevronLeft, ChevronRight, Plus, Loader } from "lucide-react"
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

// Library type không tương thích hoàn toàn với React 18 – dùng any để tránh lỗi
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Syntax: any = SyntaxHighlighter

interface Flashcard {
	front: string
	back: string
}

export interface FlashcardSet {
	id: string
	topic: string
	cards: Flashcard[]
}

interface FlashcardsProps {
	flashcardSet: FlashcardSet | null
	isRandom: boolean
	onCurrentCardChange?: (card: Flashcard | null) => void
	onGenerateMore: () => void
	canGenerateMore: boolean
	isLoading: boolean
	initialIndex: number
	onIndexChange: (index: number) => void
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
					// Check if the paragraph contains a div, which is what SyntaxHighlighter renders into.
					// This is a common pattern to avoid p-in-p or div-in-p hydration errors with react-markdown.
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

function FlashcardItem({ card }: { card: Flashcard }) {
	const [isFlipped, setIsFlipped] = useState(false)

	useEffect(() => {
		setIsFlipped(false)
	}, [card])

	return (
		<div
			className="perspective-1000 w-full max-w-2xl"
			onClick={() => setIsFlipped(!isFlipped)}
		>
			<div
				className={cn(
					"flashcard w-full h-full preserve-3d transition-transform duration-500 min-h-[28rem] cursor-pointer",
					isFlipped && "is-flipped"
				)}
			>
				{/* Front of the card */}
				<div className="flashcard-front absolute w-full h-full backface-hidden flex items-center justify-center p-6 text-center rounded-lg border shadow-lg bg-background/80 backdrop-blur-sm overflow-y-auto">
					<div className="text-2xl font-semibold prose dark:prose-invert max-w-none prose-p:my-0">
						<MarkdownRenderer>{card.front}</MarkdownRenderer>
					</div>
				</div>
				{/* Back of the card */}
				<div className="flashcard-back absolute w-full h-full backface-hidden rotate-y-180 flex items-center justify-center p-6 text-center rounded-lg border shadow-lg bg-background/80 backdrop-blur-sm overflow-y-auto">
					<div className="text-xl prose dark:prose-invert max-w-none prose-p:my-0">
						<MarkdownRenderer>{card.back}</MarkdownRenderer>
					</div>
				</div>
			</div>
		</div>
	)
}

export function Flashcards({
	flashcardSet,
	isRandom,
	onCurrentCardChange,
	onGenerateMore,
	canGenerateMore,
	isLoading,
	initialIndex,
	onIndexChange,
	onViewChange,
	currentView,
}: FlashcardsProps) {
	const [currentCardIndex, setCurrentCardIndex] = useState(initialIndex)
	const [displayedCards, setDisplayedCards] = useState<Flashcard[]>([])

	const shuffle = useCallback((cards: Flashcard[]) => {
		return [...cards].sort(() => Math.random() - 0.5)
	}, [])

	useEffect(() => {
		setCurrentCardIndex(initialIndex)
	}, [initialIndex])

	useEffect(() => {
		onIndexChange(currentCardIndex)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentCardIndex])

	useEffect(() => {
		if (!flashcardSet?.cards) {
			setDisplayedCards([])
			// Do not reset index here to avoid race conditions
			return
		}

		if (isRandom) {
			if (displayedCards.length === 0) {
				setDisplayedCards(shuffle(flashcardSet.cards))
			} else if (flashcardSet.cards.length > displayedCards.length) {
				const newCards = flashcardSet.cards.slice(displayedCards.length)
				setDisplayedCards((prev) => [...prev, ...shuffle(newCards)])
			} else if (flashcardSet.cards.length < displayedCards.length) {
				setDisplayedCards(shuffle(flashcardSet.cards))
			}
		} else {
			setDisplayedCards(flashcardSet.cards)
		}
	}, [flashcardSet?.cards, isRandom, shuffle, displayedCards.length])

	useEffect(() => {
		if (currentCardIndex >= displayedCards.length && displayedCards.length > 0) {
			setCurrentCardIndex(displayedCards.length - 1)
		} else if (displayedCards.length === 0) {
      setCurrentCardIndex(0);
    }
	}, [displayedCards.length, currentCardIndex])

	useEffect(() => {
		if (onCurrentCardChange) {
			const card = displayedCards[currentCardIndex] ?? null
			onCurrentCardChange(card)
		}
	}, [currentCardIndex, displayedCards, onCurrentCardChange])

	const totalCards = displayedCards.length
	const currentCard = displayedCards[currentCardIndex]
	const hasContent = flashcardSet && flashcardSet.cards.length > 0

	const handleNextCard = () => {
		if (currentCardIndex < totalCards - 1) {
			setCurrentCardIndex(currentCardIndex + 1)
		}
	}

	const handlePrevCard = () => {
		if (currentCardIndex > 0) {
			setCurrentCardIndex(currentCardIndex - 1)
		}
	}

	return (
		<Card className="h-full flex flex-col bg-transparent shadow-none border-none">
			<CardContent className="flex-grow pt-8 flex items-center justify-center">
				{hasContent && currentCard ? (
					<FlashcardItem
						key={`${flashcardSet?.id ?? ""}-${
							currentCard.front
						}-${currentCardIndex}`}
						card={currentCard}
					/>
				) : (
					<div className="text-center h-48 flex flex-col items-center justify-center">
						<p className="text-muted-foreground mb-4">
							Chưa có flashcard nào.
						</p>
					</div>
				)}
			</CardContent>
			<CardFooter className="flex-col !pt-8 gap-2 items-center">
				<div className="inline-flex items-center justify-center bg-background/30 backdrop-blur-sm p-2 rounded-md">
					<div className="flex items-center justify-center w-full gap-4">
						<Button
							onClick={handlePrevCard}
							disabled={currentCardIndex === 0 || !hasContent}
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
							onClick={handleNextCard}
							disabled={
								!hasContent || currentCardIndex >= totalCards - 1
							}
							variant="outline"
							size="icon"
						>
							<ChevronRight />
						</Button>
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
					</div>
				</div>
				<p className="text-center text-sm text-muted-foreground w-24">
					Thẻ {hasContent ? currentCardIndex + 1 : 0} / {totalCards}
				</p>
			</CardFooter>
		</Card>
	)
}
