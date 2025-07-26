
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { cn } from '@/lib/utils';
import type { FlashcardSet } from '@/ai/schemas';
import type { TypingState } from '@/app/types';

interface TypingProps {
    typingSet: FlashcardSet | null;
    typingIndex: number;
    typingState: TypingState | null;
    onTypingStateChange: (newState: TypingState) => void;
}

const TypingResultDisplay = ({ original, userInput }: { original: string; userInput: string }) => {
    const originalChars = original.split('');
    const inputChars = userInput.split('');

    const renderedChars = originalChars.map((char, index) => {
        let className = 'text-muted-foreground/50'; // Default: untyped
        if (index < inputChars.length) {
            if (inputChars[index] === char) {
                className = 'text-green-400'; // Correct
            } else {
                className = 'text-red-400 bg-red-500/20'; // Incorrect
            }
        }
        
        // Handle whitespace for proper rendering
        if (char === ' ') {
            return <span key={index} className={cn('whitespace-pre-wrap', className)}>{char}</span>;
        }
        return <span key={index} className={className}>{char}</span>;
    });

    const extraChars = inputChars.length > originalChars.length 
        ? inputChars.slice(originalChars.length).map((char, index) => (
            <span key={`extra-${index}`} className="text-yellow-400 bg-yellow-500/20">
                {char === ' ' ? '\u00A0' : char}
            </span>
        )) 
        : [];
        
    const caretPosition = Math.min(inputChars.length, originalChars.length);

    return (
        <div className="relative p-4 rounded-md bg-secondary text-2xl font-mono tracking-wider leading-relaxed break-words">
            <span 
                className="absolute border-l-2 border-primary animate-pulse"
                style={{ 
                    left: `${caretPosition * 0.6 + 1}em`, // font-mono approx 0.6em width + padding
                    top: '1rem',
                    bottom: '1rem',
                 }}
            />
            {renderedChars}
            {extraChars.length > 0 && <>{extraChars}</>}
        </div>
    );
};


export function Typing({
    typingSet,
    typingIndex,
    typingState,
    onTypingStateChange,
}: TypingProps) {
    const currentCard = typingSet?.cards[typingIndex];
    const userInput = typingState?.inputs[typingIndex] ?? "";
    const sourceText = currentCard?.front ?? "";

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

    return (
        <div className="h-full flex flex-col items-center justify-center bg-transparent shadow-none border-none p-4">
            {currentCard ? (
                <Card className="w-full max-w-4xl bg-background/80 backdrop-blur-sm relative">
                    {/* The Textarea is visually hidden but focused to capture input */}
                    <Textarea
                        value={userInput}
                        onChange={handleInputChange}
                        className="absolute inset-0 opacity-0 cursor-text z-10"
                        placeholder="Bắt đầu gõ..."
                        autoFocus
                    />
                    <CardHeader>
                        <CardTitle className="text-xl text-muted-foreground text-center">
                            Gõ lại nội dung sau đây:
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 cursor-text" onClick={() => document.querySelector('textarea')?.focus()}>
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
