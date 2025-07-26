
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { cn } from '@/lib/utils';
import type { CardSet } from '@/ai/schemas';
import type { TypingState } from '@/app/types';
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Syntax: any = SyntaxHighlighter

interface TypingProps {
    typingSet: CardSet | null;
    typingIndex: number;
    typingState: TypingState | null;
    onTypingStateChange: (newState: TypingState) => void;
}

const parseCodeBlock = (markdown: string): { language: string, code: string } => {
    const match = markdown.match(/^```(\w+)?\n([\s\S]+)```$/);
    if (match) {
        return {
            language: match[1] || 'text',
            code: match[2].trim(),
        };
    }
    return { language: 'text', code: markdown };
};

const TypingResultDisplay = ({ original, userInput }: { original: string; userInput: string }) => {
    const { language, code: originalCode } = useMemo(() => parseCodeBlock(original), [original]);
    
    const originalChars = originalCode.split('');
    const inputChars = userInput.split('');

    const caretPosition = inputChars.length;
    
    const codeStyle = {
        ...vscDarkPlus,
        'pre[class*="language-"]': {
            ...vscDarkPlus['pre[class*="language-"]'],
            background: "transparent",
            padding: "0",
            margin: "0",
            fontSize: "1.5rem", // 24px
            lineHeight: "1.75rem", // 28px
            letterSpacing: "0.05em",
            wordBreak: "break-word",
            whiteSpace: 'pre-wrap',
        },
        'code[class*="language-"]': {
            ...vscDarkPlus['code[class*="language-"]'],
            background: "transparent",
            padding: "0",
            fontFamily: "inherit",
        },
    };

    const CustomRenderer = ({ rows, stylesheet, useInlineStyles }: any) => {
        const renderedChars = originalChars.map((char, index) => {
            let className = 'text-muted-foreground/50'; // Default: untyped
            if (index < inputChars.length) {
                if (inputChars[index] === char) {
                    className = 'text-green-400'; // Correct
                } else {
                    className = 'text-red-400 bg-red-500/20'; // Incorrect
                }
            }
            return (
                <span key={index} className={cn(className, 'char-span')}>
                    {char === '\n' ? ' \n' : char}
                </span>
            );
        });

        const extraChars = inputChars.length > originalChars.length
            ? inputChars.slice(originalChars.length).map((char, index) => (
                <span key={`extra-${index}`} className="text-yellow-400 bg-yellow-500/20">
                    {char === ' ' ? '\u00A0' : char}
                </span>
            ))
            : [];

        const caret = <span className="border-l-2 border-primary animate-pulse" />;
        
        return (
            <span className="relative">
                {renderedChars.slice(0, caretPosition)}
                {caret}
                {renderedChars.slice(caretPosition)}
                {extraChars}
            </span>
        );
    };

    return (
        <div className="relative p-4 rounded-md bg-secondary text-2xl font-mono tracking-wider leading-relaxed break-words">
             <Syntax
                language={language}
                style={codeStyle}
                renderer={CustomRenderer}
            >
                {originalCode}
            </Syntax>
        </div>
    );
};


export function Typing({
    typingSet,
    typingIndex,
    typingState,
    onTypingStateChange,
}: TypingProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const currentCard = typingSet?.cards[typingIndex];
    const userInput = typingState?.inputs[typingIndex] ?? "";
    const sourceText = currentCard?.back ?? "";

    // Reset input when card changes
    useEffect(() => {
        // This component doesn't reset the input itself,
        // it relies on the parent passing a fresh state or different index.
    }, [typingIndex]);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (!typingState || !currentCard) return;
        const newInputs = { ...typingState.inputs, [typingIndex]: e.target.value };
        onTypingStateChange({ ...typingState, inputs: newInputs });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const textarea = textareaRef.current;
            if (!textarea) return;

            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;

            // set new value
            const newValue = userInput.substring(0, start) + '\t' + userInput.substring(end);
            if (!typingState || !currentCard) return;
            const newInputs = { ...typingState.inputs, [typingIndex]: newValue };
            onTypingStateChange({ ...typingState, inputs: newInputs });

            // put caret at right position again
            // this is needed to avoid the cursor jumping to the end
            setTimeout(() => {
                if(textareaRef.current){
                    textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 1;
                }
            }, 0);
        }
    }

    return (
        <div className="h-full flex flex-col items-center justify-center bg-transparent shadow-none border-none p-4">
            {currentCard ? (
                <Card className="w-full max-w-4xl bg-background/80 backdrop-blur-sm relative">
                    {/* The Textarea is visually hidden but focused to capture input */}
                    <Textarea
                        ref={textareaRef}
                        value={userInput}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        className="absolute inset-0 opacity-0 cursor-text z-10"
                        placeholder="Bắt đầu gõ..."
                        autoFocus
                    />
                    <CardHeader>
                        <CardTitle className="text-xl text-muted-foreground text-center">
                            {currentCard.front}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 cursor-text" onClick={() => textareaRef.current?.focus()}>
                        <TypingResultDisplay original={sourceText} userInput={userInput} />
                    </CardContent>
                     <CardFooter className="text-xs text-muted-foreground justify-center">
                        Nhấp vào đây hoặc bắt đầu gõ để luyện tập.
                    </CardFooter>
                </Card>
            ) : (
                <div className="text-center">
                    <p className="text-muted-foreground">Chưa có nội dung để gõ.</p>
                </div>
            )}
        </div>
    );
}
