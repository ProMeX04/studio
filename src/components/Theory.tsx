
"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism"
import type { TheorySet } from "@/ai/schemas"
import { ScrollArea } from "./ui/scroll-area"
import { Skeleton } from "./ui/skeleton"
import { CheckCircle, BookOpen, Menu, Plus } from "lucide-react"

// Library type không tương thích hoàn toàn với React 18 – dùng any để tránh lỗi
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Syntax: any = SyntaxHighlighter

interface TheoryProps {
	theorySet: TheorySet | null
	topic: string;
	chapterIndex: number;
	isCurrentUnderstood: boolean;
}

const MarkdownRenderer = ({ children }: { children: string }) => {
	const codeStyle = {
		...vscDarkPlus,
		'pre[class*="language-"]': {
			...vscDarkPlus['pre[class*="language-"]'],
			background: "hsl(var(--muted))",
			padding: "1rem",
            borderRadius: "0.5rem",
            fontSize: "1rem",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
		},
		'code[class*="language-"]': {
			...vscDarkPlus['code[class*="language-"]'],
			background: "transparent",
			padding: "0",
            fontSize: "1rem",
		},
	}

	return (
		<ReactMarkdown
			remarkPlugins={[remarkGfm, remarkMath]}
			rehypePlugins={[rehypeKatex]}
			components={{
				pre: ({ ...props }) => <div {...props} className="w-full overflow-x-auto my-4" />,
				code({ node, inline, className, children, ...props }: any) {
					const match = /language-(\w+)/.exec(className || "")
					if (!inline && match) {
						return (
							<Syntax
								style={codeStyle as any}
								language={match ? match[1] : "text"}
								PreTag="div"
								{...props}
							>
								{String(children).replace(/\n$/, "")}
							</Syntax>
						)
					}
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

export function Theory({ theorySet, chapterIndex, isCurrentUnderstood }: TheoryProps) {
	const currentChapter = theorySet?.chapters?.[chapterIndex];
	const hasContent = !!currentChapter;

	return (
		<div className="h-full flex flex-col bg-transparent shadow-none border-none">
			<div className="flex-grow flex items-center justify-center overflow-y-auto pb-4">
				{hasContent ? (
					<ScrollArea className="h-full w-full pr-4">
						<div className="w-full max-w-5xl mx-auto relative pt-4">
							<h1 className="text-4xl font-bold mb-8 text-center">{currentChapter.title}</h1>
							{isCurrentUnderstood && <CheckCircle className="absolute top-0 right-0 text-success w-6 h-6" />}
							<div className="prose dark:prose-invert max-w-none text-xl">
								{currentChapter.content ? (
									<MarkdownRenderer>{currentChapter.content}</MarkdownRenderer>
								) : (
									<div className="space-y-4 pt-4">
										<Skeleton className="h-8 w-3/4" />
										<Skeleton className="h-6 w-full" />
										<Skeleton className="h-6 w-full" />
										<Skeleton className="h-6 w-5/6" />
										<br/>
										<Skeleton className="h-6 w-full" />
										<Skeleton className="h-6 w-4/5" />
									</div>
								)}
							</div>
						</div>
					</ScrollArea>
				) : (
					<Card className="w-full max-w-lg text-center bg-background/80 backdrop-blur-sm">
						<CardHeader>
							<div className="mx-auto bg-primary/10 p-4 rounded-full">
								<BookOpen className="w-12 h-12 text-primary" />
							</div>
							<CardTitle className="mt-4 text-2xl">Xây dựng nền tảng kiến thức</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-muted-foreground">
								Nhấn vào nút <strong className="text-foreground">Menu</strong> <Menu className="inline w-4 h-4" /> trên thanh công cụ, sau đó nhấn nút <Plus className="inline w-4 h-4" /> bên cạnh mục Lý thuyết để AI tạo dàn bài và nội dung cho bạn.
							</p>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
