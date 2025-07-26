
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
								PreTag="div"
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

export function Theory({
	theorySet,
	topic,
}: TheoryProps) {
	
	const hasContent = !!theorySet?.content;
	
	return (
		<ScrollArea className="h-full pr-4">
            <div className="h-full flex flex-col bg-transparent shadow-none border-none">
                <div className="flex-grow flex items-start justify-center overflow-y-auto pb-4">
                    {hasContent ? (
                        <div className="w-full max-w-5xl mx-auto prose dark:prose-invert prose-h1:text-4xl prose-h2:mt-10 prose-p:my-4 prose-p:leading-relaxed prose-li:my-2 prose-a:text-primary">
                            <MarkdownRenderer>{theorySet.content}</MarkdownRenderer>
                        </div>
                    ) : (
                        <div className="text-center h-48 flex flex-col items-center justify-center">
                            <div className="text-center flex flex-col items-center justify-center">
                                <p className="text-muted-foreground mb-4">
                                    Chưa có nội dung lý thuyết.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </ScrollArea>
	)
}
