"use client";

import { useState, useMemo } from 'react';
import { BookOpen, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { generateFlashcards, GenerateFlashcardsOutput } from '@/ai/flows/generate-flashcards';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export function Flashcards() {
  const [topic, setTopic] = useState('');
  const [flashcards, setFlashcards] = useState<GenerateFlashcardsOutput>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!topic.trim()) return;

    setIsLoading(true);
    setFlashcards([]);
    setCurrentCardIndex(0);
    setIsFlipped(false);

    try {
      const result = await generateFlashcards({ topic });
      if (result.length === 0) {
        toast({ title: 'No flashcards generated', description: 'Try a different topic.' });
      }
      setFlashcards(result);
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to generate flashcards.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
        if(currentCardIndex === flashcards.length - 1) {
            handleGenerate();
        } else {
            setCurrentCardIndex((prev) => prev + 1);
        }
    }, 150) // wait for flip back animation
  };

  const currentCard = useMemo(() => flashcards[currentCardIndex], [flashcards, currentCardIndex]);

  return (
    <Card className="h-full flex flex-col bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <BookOpen className="h-5 w-5" />
          AI Flashcards
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-center items-center">
        {isLoading ? (
          <div className="w-full h-48 flex flex-col justify-center items-center gap-4 p-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : flashcards.length > 0 ? (
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
              Card {currentCardIndex + 1} of {flashcards.length}
            </p>
          </div>
        ) : (
          <div className="text-center text-muted-foreground h-48 flex items-center justify-center">
             Enter a topic to generate flashcards.
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col !pt-0 gap-2">
        {flashcards.length > 0 ? (
            <Button onClick={handleNext} className="w-full">
              {currentCardIndex === flashcards.length - 1 ? "Generate New Set" : "Next Card"}
            </Button>
        ) : (
          <form onSubmit={handleGenerate} className="flex w-full gap-2">
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. World Capitals"
              disabled={isLoading}
              className='bg-background/50'
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <RefreshCw className="h-4 w-4 animate-spin"/> : 'Go'}
            </Button>
          </form>
        )}
      </CardFooter>
    </Card>
  );
}
