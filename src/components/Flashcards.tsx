
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, Shuffle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface Flashcard {
  front: string;
  back: string;
}

export interface FlashcardSet {
  id: string;
  topic: string;
  cards: Flashcard[];
}

interface FlashcardsProps {
  flashcardSet: FlashcardSet | null;
  displayCount: number;
  isRandom: boolean;
}

function FlashcardItem({ card }: { card: Flashcard }) {
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    setIsFlipped(false);
  }, [card]);

  return (
    <div className="perspective-1000" onClick={() => setIsFlipped(!isFlipped)}>
        <div className={cn("flashcard w-full h-full preserve-3d transition-transform duration-500 min-h-[12rem] cursor-pointer", isFlipped && 'is-flipped')}>
            {/* Front of the card */}
            <div className="flashcard-front absolute w-full h-full backface-hidden flex flex-col items-start justify-start p-4 text-center rounded-lg border shadow-lg bg-background/80 backdrop-blur-sm">
                <div className="text-lg font-semibold prose dark:prose-invert max-w-none prose-p:my-0 w-full text-left">
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{card.front}</ReactMarkdown>
                </div>
            </div>
            {/* Back of the card */}
            <div className="flashcard-back absolute w-full h-full backface-hidden rotate-y-180 flex flex-col items-start justify-start p-4 text-center rounded-lg border shadow-lg bg-background/80 backdrop-blur-sm">
                <div className="text-lg prose dark:prose-invert max-w-none prose-p:my-0 w-full text-left">
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{card.back}</ReactMarkdown>
                </div>
            </div>
        </div>
    </div>
  );
}

export function Flashcards({ flashcardSet, displayCount, isRandom }: FlashcardsProps) {
  const [currentPage, setCurrentPage] = useState(0);

  const shuffle = useCallback((cards: Flashcard[]) => {
    return [...cards].sort(() => Math.random() - 0.5);
  }, []);

  const displayedCards = useMemo(() => {
    if (!flashcardSet?.cards) return [];
    return isRandom ? shuffle(flashcardSet.cards) : flashcardSet.cards;
  }, [flashcardSet, isRandom, shuffle]);

  useEffect(() => {
    // Reset to first page whenever the cards or randomness change
    setCurrentPage(0);
  }, [displayedCards]);
  
  const totalPages = Math.ceil(displayedCards.length / (displayCount > 0 ? displayCount : 1));
  
  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  if (!flashcardSet || flashcardSet.cards.length === 0) {
    return (
      <div className="text-center h-48 flex items-center justify-center">
         Nhập một chủ đề trong cài đặt và nhấp vào "Lưu" để tạo một số thẻ flashcard.
      </div>
    );
  }

  const startIndex = currentPage * displayCount;
  const endIndex = startIndex + displayCount;
  const currentCards = displayedCards.slice(startIndex, endIndex);

  return (
    <Card className="h-full flex flex-col bg-transparent shadow-none border-none">
      <CardContent className="flex-grow pt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          {currentCards.map((card, index) => (
            <FlashcardItem key={`${flashcardSet.id}-${card.front}-${startIndex + index}`} card={card} />
          ))}
        </div>
      </CardContent>
       <CardFooter className="flex-col !pt-8 gap-2 items-center">
         {totalPages > 1 && (
            <div className="flex items-center justify-center w-full gap-4">
                <Button onClick={handlePrevPage} disabled={currentPage === 0} variant="outline" size="icon">
                    <ChevronLeft />
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Trang {currentPage + 1} / {totalPages}
                </p>
                <Button onClick={handleNextPage} disabled={currentPage >= totalPages - 1} variant="outline" size="icon">
                    <ChevronRight />
                </Button>
            </div>
         )}
      </CardFooter>
    </Card>
  );
}

    