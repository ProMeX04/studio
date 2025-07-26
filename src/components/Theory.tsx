
"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism"
import type { TheorySet } from "@/ai/schemas"
import { ScrollArea } from "./ui/scroll-area"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion"
import { Skeleton } from "./ui/skeleton"

// Library type không tương thích hoàn toàn với React 18 – dùng any để tránh lỗi
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Syntax: any = SyntaxHighlighter

interface TheoryProps {
	theorySet: TheorySet | null
	topic: string;
}

const MarkdownRenderer = ({ children }: { children: string }) => {
	const codeStyle = {
		...vscDarkPlus,
		'pre[class*="language-"]': {
			...vscDarkPlus['pre[class*="language-"]'],
			background: "hsl(var(--muted))",
			padding: "1rem",
            borderRadius: "0.5rem",
            fontSize: "14px",
		},
		'code[class*="language-"]': {
			...vscDarkPlus['code[class*="language-"]'],
			background: "transparent",
			padding: "0",
            fontSize: "14px",
		},
	}

	return (
		<ReactMarkdown
			remarkPlugins={[remarkGfm, remarkMath]}
			rehypePlugins={[rehypeKatex]}
			components={{
				p: ({ ...props }) => <p {...props} className="leading-7 [&:not(:first-child)]:mt-6" />,
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
				h1: ({...props}) => <h1 className="text-4xl font-bold mt-8 mb-4" {...props} />,
                h2: ({...props}) => <h2 className="text-3xl font-semibold mt-8 mb-4" {...props} />,
                h3: ({...props}) => <h3 className="text-2xl font-semibold mt-6 mb-3" {...props} />,
                ul: ({...props}) => <ul className="list-disc pl-6 my-4" {...props} />,
                ol: ({...props}) => <ol className="list-decimal pl-6 my-4" {...props} />,
                li: ({...props}) => <li className="my-2" {...props} />,
                a: ({...props}) => <a className="text-primary hover:underline" {...props} />,
                blockquote: ({...props}) => <blockquote className="mt-6 border-l-2 pl-6 italic" {...props} />,
			}}
		>
			{children}
		</ReactMarkdown>
	)
}

export function Theory({ theorySet, topic }: TheoryProps) {
	const hasContent = theorySet && ((theorySet.outline?.length ?? 0) > 0 || (theorySet.chapters?.length ?? 0) > 0);

	return (
		<ScrollArea className="h-full pr-4">
			<div className="h-full flex flex-col bg-transparent shadow-none border-none">
				<div className="flex-grow flex items-start justify-center overflow-y-auto pb-4">
					{hasContent ? (
						<Accordion type="multiple" className="w-full max-w-5xl mx-auto">
							{theorySet.chapters.map((chapter, index) => (
								<AccordionItem value={`item-${index}`} key={index}>
									<AccordionTrigger className="text-2xl font-semibold hover:no-underline">
										{chapter.title}
									</AccordionTrigger>
									<AccordionContent className="prose dark:prose-invert max-w-none">
										{chapter.content ? (
											<MarkdownRenderer>{chapter.content}</MarkdownRenderer>
										) : (
											<div className="space-y-4 pt-4">
												<Skeleton className="h-4 w-full" />
												<Skeleton className="h-4 w-full" />
												<Skeleton className="h-4 w-3/4" />
												<Skeleton className="h-4 w-4/5" />
											</div>
										)}
									</AccordionContent>
								</AccordionItem>
							))}
						</Accordion>
					) : (
						<div className="text-center h-48 flex flex-col items-center justify-center">
							<p className="text-muted-foreground mb-4">
								Chưa có nội dung lý thuyết.
							</p>
						</div>
					)}
				</div>
			</div>
		</ScrollArea>
	);
}
