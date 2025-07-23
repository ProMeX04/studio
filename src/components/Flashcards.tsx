
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
}

function FlashcardItem({ card }: { card: Flashcard }) {
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    setIsFlipped(false);
  }, [card]);

  return (
    <div className="flashcard-container h-48 perspective-1000" onClick={() => setIsFlipped(!isFlipped)}>
      <div className={cn("flashcard relative w-full h-full cursor-pointer transition-transform duration-700 preserve-3d", { 'is-flipped': isFlipped })}>
        <div className="flashcard-front absolute w-full h-full flex items-center justify-center p-4 text-center rounded-lg border shadow-lg backface-hidden bg-primary/20 backdrop-blur">
          <p className="text-lg font-semibold">{card.front}</p>
        </div>
        <div className="flashcard-back absolute w-full h-full flex items-center justify-center p-4 text-center rounded-lg border shadow-lg backface-hidden rotate-y-180 bg-secondary/20 backdrop-blur">
          <p className="text-lg">{card.back}</p>
        </div>
      </div>
    </div>
  );
}


export function Flashcards({ flashcardSet, displayCount }: FlashcardsProps) {
  const [currentPage, setCurrentPage] = useState(0);

  const cards = flashcardSet?.cards || [];
  const totalPages = Math.ceil(cards.length / (displayCount > 0 ? displayCount : 1));
  
  useEffect(() => {
    setCurrentPage(0);
  }, [flashcardSet]);

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

  if (!flashcardSet || cards.length === 0) {
    return (
      <div className="text-center h-48 flex items-center justify-center">
         Nhập một chủ đề trong cài đặt và nhấp vào "Lưu" để tạo một số thẻ flashcard.
      </div>
    );
  }

  const startIndex = currentPage * displayCount;
  const endIndex = startIndex + displayCount;
  const currentCards = cards.slice(startIndex, endIndex);

  return (
    <Card className="h-full flex flex-col bg-transparent shadow-none border-none">
      <CardContent className="flex-grow pt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {currentCards.map((card, index) => (
            <FlashcardItem key={`${flashcardSet.id}-${startIndex + index}`} card={card} />
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
