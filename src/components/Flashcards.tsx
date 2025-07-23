
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


export function Flashcards({ flashcardSet }: FlashcardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setCurrentIndex(0);
  }, [flashcardSet]);

  const handleNext = () => {
    if (flashcardSet && currentIndex < flashcardSet.cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (!flashcardSet || flashcardSet.cards.length === 0) {
    return (
      <div className="text-center h-48 flex items-center justify-center">
         Nhập một chủ đề trong cài đặt và nhấp vào "Lưu" để tạo một số thẻ flashcard.
      </div>
    );
  }

  const currentCard = flashcardSet.cards[currentIndex];

  return (
    <Card className="h-full flex flex-col bg-transparent shadow-none border-none">
      <CardContent className="flex-grow pt-8 flex justify-center items-center">
        <div className="w-full max-w-sm">
          {currentCard && <FlashcardItem card={currentCard} />}
        </div>
      </CardContent>
       <CardFooter className="flex-col !pt-0 gap-2 items-center">
        <div className="flex items-center justify-center w-full gap-4">
            <Button onClick={handlePrev} disabled={currentIndex === 0} variant="outline" size="icon">
                <ChevronLeft />
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Thẻ {currentIndex + 1} trên {flashcardSet.cards.length}
            </p>
            <Button onClick={handleNext} disabled={currentIndex === flashcardSet.cards.length - 1} variant="outline" size="icon">
                <ChevronRight />
            </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
