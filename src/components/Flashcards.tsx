
"use client"

import React, {
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
import {
	ChevronLeft,
	ChevronRight,
	Plus,
	Loader,
	Droplets,
	CheckCircle,
} from "lucide-react"
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
	initialIndex: number
	onIndexChange: (index: number) => void
	topic: string;
	understoodIndices: number[];
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

function FlashcardItem({ card, isUnderstood }: { card: Flashcard; isUnderstood: boolean }) {
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
					"flashcard w-full h-full preserve-3d transition-transform duration-500 min-h-[34rem] cursor-pointer",
					isFlipped && "is-flipped"
				)}
			>
				{/* Front of the card */}
				<div className="flashcard-front absolute w-full h-full backface-hidden flex items-center justify-center p-6 text-center rounded-lg border shadow-lg bg-background/80 backdrop-blur-sm overflow-y-auto">
					<div className="text-2xl font-semibold prose dark:prose-invert max-w-none prose-p:my-0">
						<MarkdownRenderer>{card.front}</MarkdownRenderer>
					</div>
					{isUnderstood && <CheckCircle className="absolute top-4 right-4 text-success w-6 h-6" />}
				</div>
				{/* Back of the card */}
				<div className="flashcard-back absolute w-full h-full backface-hidden rotate-y-180 flex items-center justify-center p-6 text-center rounded-lg border shadow-lg bg-background/80 backdrop-blur-sm overflow-y-auto">
					<div className="text-xl prose dark:prose-invert max-w-none prose-p:my-0">
						<MarkdownRenderer>{card.back}</MarkdownRenderer>
					</div>
					{isUnderstood && <CheckCircle className="absolute top-4 right-4 text-success w-6 h-6" />}
				</div>
			</div>
		</div>
	)
}

export function Flashcards({
	flashcardSet,
	initialIndex,
	onIndexChange,
	topic,
	understoodIndices,
}: FlashcardsProps) {
	const [currentCardIndex, setCurrentCardIndex] = useState(initialIndex)

	useEffect(() => {
		setCurrentCardIndex(initialIndex)
	}, [initialIndex])

	useEffect(() => {
		onIndexChange(currentCardIndex)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentCardIndex])

	useEffect(() => {
        if (flashcardSet && currentCardIndex >= flashcardSet.cards.length && flashcardSet.cards.length > 0) {
            setCurrentCardIndex(flashcardSet.cards.length - 1);
        } else if (!flashcardSet || flashcardSet.cards.length === 0) {
            setCurrentCardIndex(0);
        }
    }, [flashcardSet, currentCardIndex]);

	const totalCards = flashcardSet?.cards.length ?? 0
	const currentCard = flashcardSet?.cards[currentCardIndex];
	const hasContent = totalCards > 0;

	// Determine if the current card is understood. The index passed to this component is the "true" index from the original array
	const isUnderstood = understoodIndices.includes(currentCardIndex);

	return (
		<div className="h-full flex flex-col bg-transparent shadow-none border-none">
			<div className="flex-grow flex items-center justify-center overflow-y-auto pb-4">
				{hasContent && currentCard ? (
					<FlashcardItem
						key={`${flashcardSet?.id ?? ""}-${
							currentCard.front
						}-${currentCardIndex}`}
						card={currentCard}
						isUnderstood={isUnderstood}
					/>
				) : (
					<div className="text-center h-48 flex flex-col items-center justify-center">
						<div className="text-center flex flex-col items-center justify-center">
							<p className="text-muted-foreground mb-4">
								Chưa có flashcard nào.
							</p>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}

    