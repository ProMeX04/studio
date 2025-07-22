"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';

interface Flashcard {
  front: string;
  back: string;
}

interface FlashcardSet {
  id: string;
  topic: string;
  cards: Flashcard[];
}

export function Flashcards() {
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>([]);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchFlashcards = async () => {
      setIsLoading(true);
      try {
        const q = query(collection(db, 'flashcards'), orderBy('createdAt', 'desc'), limit(5));
        const querySnapshot = await getDocs(q);
        const sets = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FlashcardSet));
        setFlashcardSets(sets);
        if (sets.length === 0) {
          toast({ title: 'No flashcards found', description: 'Generate a new set to get started.' });
        }
      } catch (error) {
        console.error(error);
        toast({ title: 'Error', description: 'Failed to fetch flashcards.', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchFlashcards();
  }, [toast]);

  const handleNextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCardIndex((prev) => (prev + 1) % (flashcardSets[currentSetIndex]?.cards.length || 1));
    }, 150);
  };
  
  const handleNextSet = () => {
      setIsFlipped(false);
      setCurrentCardIndex(0);
      setCurrentSetIndex((prev) => (prev + 1) % (flashcardSets.length || 1));
  }

  const currentSet = useMemo(() => flashcardSets[currentSetIndex], [flashcardSets, currentSetIndex]);
  const currentCard = useMemo(() => currentSet?.cards[currentCardIndex], [currentSet, currentCardIndex]);

  return (
    <Card className="h-full flex flex-col bg-transparent shadow-none border-none">
      <CardHeader>
        <CardTitle className="flex items-center justify-end gap-2 font-headline">
          {currentSet && <span className="text-sm font-normal text-muted-foreground">{currentSet.topic}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-center items-center">
        {isLoading ? (
          <div className="w-full h-48 flex flex-col justify-center items-center gap-4 p-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : currentCard ? (
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
              Card {currentCardIndex + 1} of {currentSet.cards.length}
            </p>
          </div>
        ) : (
          <div className="text-center text-muted-foreground h-48 flex items-center justify-center">
             No flashcards available. Enter a topic above and click "Generate" to create some.
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col !pt-0 gap-2">
        {flashcardSets.length > 0 && (
          <div className="w-full flex gap-2">
            <Button onClick={handleNextCard} className="w-full">Next Card</Button>
            <Button onClick={handleNextSet} variant="secondary" className="w-full">Next Set</Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
