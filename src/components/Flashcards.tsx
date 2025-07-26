
"use client"

import React, {
	useState,
	useEffect,
	useCallback,
	Fragment,
	ReactNode,
	useRef,
} from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Button } from "./ui/button"
import {
	ChevronLeft,
	ChevronRight,
	Plus,
	Loader,
	Droplets,
	CheckCircle,
	BookOpen,
	Menu,
	Settings,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism"
import type { CardData, CardSet } from "@/ai/schemas"

// Library type không tương thích hoàn toàn với React 18 – dùng any để tránh lỗi
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Syntax: any = SyntaxHighlighter


interface FlashcardsProps {
	flashcardSet: CardSet | null
	flashcardIndex: number
	topic: string;
	isCurrentUnderstood: boolean;
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

function FlashcardItem({ card, isUnderstood }: { card: CardData; isUnderstood: boolean }) {
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
					<div className="text-3xl font-semibold prose dark:prose-invert max-w-none prose-p:my-0">
						<MarkdownRenderer>{card.front}</MarkdownRenderer>
					</div>
					{isUnderstood && <CheckCircle className="absolute top-4 right-4 text-success w-6 h-6" />}
				</div>
				{/* Back of the card */}
				<div className="flashcard-back absolute w-full h-full backface-hidden rotate-y-180 flex items-center justify-center p-6 text-center rounded-lg border shadow-lg bg-background/80 backdrop-blur-sm overflow-y-auto">
					<div className="text-2xl prose dark:prose-invert max-w-none prose-p:my-0">
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
	flashcardIndex,
	topic,
	isCurrentUnderstood,
}: FlashcardsProps) {
	
	const totalCards = flashcardSet?.cards.length ?? 0
	const currentCard = flashcardSet?.cards[flashcardIndex];
	const hasContent = totalCards > 0 && !!currentCard;
	
	return (
		<div className="h-full flex flex-col bg-transparent shadow-none border-none">
			<div className="flex-grow flex items-center justify-center overflow-y-auto pb-4">
				{hasContent ? (
					<FlashcardItem
						key={`${flashcardSet?.id ?? ""}-${flashcardIndex}`}
						card={currentCard}
						isUnderstood={isCurrentUnderstood}
					/>
				) : (
					<Card className="w-full max-w-lg text-center bg-background/80 backdrop-blur-sm">
						<CardHeader>
							<div className="mx-auto bg-primary/10 p-4 rounded-full">
								<BookOpen className="w-12 h-12 text-primary" />
							</div>
							<CardTitle className="mt-4 text-2xl">Bắt đầu học với Flashcard</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-muted-foreground">
								Nhấn vào nút <strong className="text-foreground">Menu</strong> <Menu className="inline w-4 h-4" /> trên thanh công cụ, chọn <strong className="text-foreground">Tạo</strong>, và để AI tạo ra các thẻ ghi nhớ cho bạn!
							</p>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	)
}
