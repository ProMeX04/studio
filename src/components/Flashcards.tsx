"use client"

import { useState, useEffect, useCallback } from "react"
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
							<Syntax
								style={codeStyle as any}
								language={match[1]}
								PreTag="div"
								wrapLongLines={true}
								{...props}
							>
								{String(children).replace(/\n$/, "")}
							</Syntax>
						)
					}
					return inline ? (
						<code
							className={cn(className, "inline-code")}
							{...props}
						>
							{children}
						</code>
					) : (
						<code className={className} {...props}>
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
	onGenerateMore,
	canGenerateMore,
	isLoading,
}: FlashcardsProps) {
	const [currentCardIndex, setCurrentCardIndex] = useState(0)

	// Giữ một mảng thẻ đã hiển thị để tránh bị xáo trộn lại khi thêm mới
	const [displayedCards, setDisplayedCards] = useState<Flashcard[]>([])

	const shuffle = useCallback((cards: Flashcard[]) => {
		return [...cards].sort(() => Math.random() - 0.5)
	}, [])

	// Cập nhật displayedCards chỉ khi số lượng thẻ tăng lên hoặc chế độ random thay đổi
	useEffect(() => {
		if (!flashcardSet?.cards) {
			setDisplayedCards([])
			setCurrentCardIndex(0)
			return
		}

		if (isRandom) {
			if (displayedCards.length === 0) {
				// Lần đầu tiên: xáo trộn toàn bộ
				setDisplayedCards(shuffle(flashcardSet.cards))
			} else if (flashcardSet.cards.length > displayedCards.length) {
				// Có thẻ mới, chỉ xáo trộn phần mới rồi gắn vào cuối
				const newCards = flashcardSet.cards.slice(displayedCards.length)
				setDisplayedCards((prev) => [...prev, ...shuffle(newCards)])
			} else if (flashcardSet.cards.length < displayedCards.length) {
				// Topic changed, shuffle all again
				setDisplayedCards(shuffle(flashcardSet.cards))
			}
		} else {
			// Không random: giữ nguyên thứ tự server gửi
			setDisplayedCards(flashcardSet.cards)
		}
	}, [flashcardSet?.cards, isRandom, shuffle, displayedCards.length])

	// Nếu số thẻ tăng làm index vượt quá, điều chỉnh về cuối cùng
	useEffect(() => {
		if (currentCardIndex >= displayedCards.length) {
			setCurrentCardIndex(Math.max(0, displayedCards.length - 1))
		}
	}, [displayedCards.length, currentCardIndex])

	// Thông báo cho parent khi current card thay đổi
	useEffect(() => {
		if (onCurrentCardChange) {
			const card = displayedCards[currentCardIndex] ?? null
			onCurrentCardChange(card)
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
						key={`${flashcardSet?.id ?? ""}-${
							currentCard.front
						}-${currentCardIndex}`}
						card={currentCard}
					/>
				)}
			</CardContent>
			<CardFooter className="flex-col !pt-8 gap-2 items-center">
				{totalCards > 0 && (
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
							{canGenerateMore && (
								<Button
									onClick={onGenerateMore}
									disabled={isLoading}
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
				)}
			</CardFooter>
		</Card>
	)
}
