"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Button } from "./ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism"

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
				code({ node, inline, className, children, ...props }) {
					const match = /language-(\w+)/.exec(className || "")
					if (!inline && match) {
						return (
							<SyntaxHighlighter
								style={codeStyle}
								language={match[1]}
								PreTag="div"
								wrapLongLines={true}
								{...props}
							>
								{String(children).replace(/\n$/, "")}
							</SyntaxHighlighter>
						)
					}
					return (
						<code
							className={cn(className, "inline-code")}
							{...props}
						>
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
}: FlashcardsProps) {
	const [currentCardIndex, setCurrentCardIndex] = useState(0)

	const shuffle = useCallback((cards: Flashcard[]) => {
		return [...cards].sort(() => Math.random() - 0.5)
	}, [])

	const displayedCards = useMemo(() => {
		if (!flashcardSet?.cards) return []
		return isRandom ? shuffle(flashcardSet.cards) : flashcardSet.cards
	}, [flashcardSet, isRandom, shuffle])

	useEffect(() => {
		// Reset to first card whenever the cards or randomness change
		setCurrentCardIndex(0)
	}, [displayedCards])

	// Notify parent when current card changes
	useEffect(() => {
		if (onCurrentCardChange) {
			const card = displayedCards[currentCardIndex] ?? null
			onCurrentCardChange(card || null)
		}
	}, [currentCardIndex, displayedCards, onCurrentCardChange])

	const totalCards = displayedCards.length

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

	if (!flashcardSet || flashcardSet.cards.length === 0) {
		return (
			<div className="text-center h-48 flex items-center justify-center">
				Nhập một chủ đề trong cài đặt và nhấp vào "Lưu" để tạo một số
				thẻ flashcard.
			</div>
		)
	}

	const currentCard = displayedCards[currentCardIndex]

	return (
		<Card className="h-full flex flex-col bg-transparent shadow-none border-none">
			<CardContent className="flex-grow pt-8 flex items-center justify-center">
				{currentCard && (
					<FlashcardItem
						key={`${flashcardSet.id}-${currentCard.front}-${currentCardIndex}`}
						card={currentCard}
					/>
				)}
			</CardContent>
			<CardFooter className="flex-col !pt-8 gap-2 items-center">
				{totalCards > 1 && (
					<div className="inline-flex items-center justify-center bg-background/30 backdrop-blur-sm p-2 rounded-md">
						<div className="flex items-center justify-center w-full gap-4">
							<Button
								onClick={handlePrevCard}
								disabled={currentCardIndex === 0}
								variant="outline"
								size="icon"
							>
								<ChevronLeft />
							</Button>
							<p className="text-center text-sm text-muted-foreground w-24">
								Thẻ {currentCardIndex + 1} / {totalCards}
							</p>
							<Button
								onClick={handleNextCard}
								disabled={currentCardIndex >= totalCards - 1}
								variant="outline"
								size="icon"
							>
								<ChevronRight />
							</Button>
						</div>
					</div>
				)}
			</CardFooter>
		</Card>
	)
}
