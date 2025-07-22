"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';

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

export function Flashcards({ flashcardSet }: FlashcardsProps) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    // Reset when the set changes
    setCurrentCardIndex(0);
    setIsFlipped(false);
  }, [flashcardSet]);


  const handleNextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCardIndex((prev) => (prev + 1) % (flashcardSet?.cards.length || 1));
    }, 150);
  };

  const currentCard = useMemo(() => flashcardSet?.cards[currentCardIndex], [flashcardSet, currentCardIndex]);

  if (!flashcardSet) {
    return (
      <div className="text-center text-muted-foreground h-48 flex items-center justify-center">
         Enter a topic above and click "Generate" to create some flashcards.
      </div>
    );
  }

  return (
    <Card className="h-full flex flex-col bg-transparent shadow-none border-none">
      <CardHeader>
        <CardTitle className="flex items-center justify-end gap-2 font-headline">
          {flashcardSet && <span className="text-sm font-normal text-muted-foreground">{flashcardSet.topic}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-center items-center">
       {currentCard ? (
          <div className="w-full space-y-4">
            <div className="flashcard-container h-48" onClick={() => setIsFlipped(!isFlipped)}>
              <div className={cn("flashcard relative w-full h-full cursor-pointer rounded-lg border bg-primary/20", { 'is-flipped': isFlipped })}>
                <div className="flashcard-front absolute w-full h-full flex items-center justify-center p-4 text-center">
                  <p className="text-lg font-semibold text-primary-foreground">{currentCard?.front}</p>
                </div>
                <div className="flashcard-back absolute w-full h-full flex items-center justify-center p-4 text-center rounded-lg bg-accent/30">
                  <p className="text-lg text-accent-foreground">{currentCard?.back}</p>
                </div>
              </div>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Card {currentCardIndex + 1} of {flashcardSet.cards.length}
            </p>
          </div>
        ) : (
          <div className="text-center text-muted-foreground h-48 flex items-center justify-center">
             No flashcards available.
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col !pt-0 gap-2">
        {flashcardSet.cards.length > 0 && (
          <div className="w-full flex gap-2">
            <Button onClick={handleNextCard} className="w-full">Next Card</Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
