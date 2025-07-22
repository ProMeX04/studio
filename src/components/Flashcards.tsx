"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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

function FlashcardItem({ card }: { card: Flashcard }) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="flashcard-container h-48 perspective-1000" onClick={() => setIsFlipped(!isFlipped)}>
      <div className={cn("flashcard relative w-full h-full cursor-pointer transition-transform duration-700 preserve-3d", { 'is-flipped': isFlipped })}>
        <div className="flashcard-front absolute w-full h-full flex items-center justify-center p-4 text-center rounded-lg border bg-primary text-primary-foreground shadow-lg backface-hidden">
          <p className="text-lg font-semibold">{card.front}</p>
        </div>
        <div className="flashcard-back absolute w-full h-full flex items-center justify-center p-4 text-center rounded-lg border bg-secondary text-secondary-foreground shadow-lg backface-hidden rotate-y-180">
          <p className="text-lg">{card.back}</p>
        </div>
      </div>
    </div>
  );
}


export function Flashcards({ flashcardSet }: FlashcardsProps) {
   useEffect(() => {
    // Nothing to reset on set change anymore
  }, [flashcardSet]);

  if (!flashcardSet || flashcardSet.cards.length === 0) {
    return (
      <div className="text-center text-muted-foreground h-48 flex items-center justify-center">
         Enter a topic in settings and click "Save" to create some flashcards.
      </div>
    );
  }

  return (
    <Card className="h-full flex flex-col bg-transparent shadow-none border-none">
      <CardContent className="flex-grow pt-8">
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flashcardSet.cards.map((card, index) => (
            <FlashcardItem key={index} card={card} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
