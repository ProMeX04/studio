
"use client";

import React, { useState, useEffect } from 'react';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { FlashcardSet } from '@/ai/schemas';
import type { TypingState } from '@/app/types';

interface TypingProps {
    typingSet: FlashcardSet | null;
    typingIndex: number;
    typingState: TypingState | null;
    onTypingStateChange: (newState: TypingState) => void;
}

const getDiff = (original: string, comparison: string) => {
    const originalChars = original.split('');
    const comparisonChars = comparison.split('');
    let result = [];
    const maxLength = Math.max(originalChars.length, comparisonChars.length);

    for (let i = 0; i < maxLength; i++) {
        const originalChar = originalChars[i];
        const comparisonChar = comparisonChars[i];

        if (originalChar !== undefined && originalChar === comparisonChar) {
            result.push(<span key={`correct-${i}`} className="text-green-400">{originalChar}</span>);
        } else {
            if (originalChar !== undefined) {
                result.push(<span key={`incorrect-${i}`} className="text-red-400 bg-red-400/20">{originalChar}</span>);
            }
            if (comparisonChar !== undefined && originalChar === undefined) {
                 result.push(<span key={`extra-${i}`} className="text-yellow-400 bg-yellow-400/20">{comparisonChar}</span>);
            }
        }
    }

    return <>{result}</>;
};

export function Typing({
    typingSet,
    typingIndex,
    typingState,
    onTypingStateChange,
}: TypingProps) {
    const currentCard = typingSet?.cards[typingIndex];
    const userInput = typingState?.inputs[typingIndex] ?? "";
    const [isSubmitted, setIsSubmitted] = useState(false);

    // Reset submission state when the card changes
    useEffect(() => {
        setIsSubmitted(!!typingState?.inputs.hasOwnProperty(typingIndex));
    }, [typingIndex, typingState]);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (!typingState) return;
        const newInputs = { ...typingState.inputs, [typingIndex]: e.target.value };
        onTypingStateChange({ ...typingState, inputs: newInputs });
    };

    const handleSubmit = () => {
        if (userInput.trim() !== '') {
            setIsSubmitted(true);
        }
    };
    
    const handleRetry = () => {
        if (!typingState) return;
        const newInputs = { ...typingState.inputs };
        delete newInputs[typingIndex];
        onTypingStateChange({ ...typingState, inputs: newInputs });
        setIsSubmitted(false);
    };

    const isCorrect = currentCard && userInput.trim() === currentCard.back.trim();

    return (
        <div className="h-full flex flex-col items-center justify-center bg-transparent shadow-none border-none p-4">
            {currentCard ? (
                <Card className="w-full max-w-3xl bg-background/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-xl text-muted-foreground text-center">
                            Gõ lại nội dung sau:
                        </CardTitle>
                        <div className="p-4 rounded-md bg-secondary text-center text-2xl font-semibold">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentCard.front}</ReactMarkdown>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Textarea
                            value={userInput}
                            onChange={handleInputChange}
                            placeholder="Nhập nội dung mặt sau của thẻ vào đây..."
                            className="min-h-[150px] text-lg"
                            disabled={isSubmitted}
                        />
                        {isSubmitted && (
                             <div className="p-4 rounded-md border">
                                <h4 className="font-semibold mb-2">Kết quả:</h4>
                                {isCorrect ? (
                                    <p className="text-green-500 font-bold">Chính xác! Bạn đã gõ đúng.</p>
                                ) : (
                                    <div className="space-y-2">
                                        <p className="text-red-500 font-bold">Chưa chính xác. Dưới đây là so sánh:</p>
                                        <div className="p-2 rounded-md bg-secondary font-mono text-sm whitespace-pre-wrap break-words">
                                            {getDiff(currentCard.back, userInput)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        {isSubmitted ? (
                             <Button onClick={handleRetry} className="w-full">Thử lại</Button>
                        ) : (
                            <Button onClick={handleSubmit} disabled={!userInput.trim()} className="w-full">Kiểm tra</Button>
                        )}
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

    