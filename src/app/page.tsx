"use client";

import { useState, useEffect, useCallback } from 'react';
import { Greeting } from '@/components/Greeting';
import { Search } from '@/components/Search';
import { QuickLinks } from '@/components/QuickLinks';
import { Clock } from '@/components/Clock';
import { Flashcards, FlashcardSet } from '@/components/Flashcards';
import { Quiz, QuizSet } from '@/components/Quiz';
import { useToast } from '@/hooks/use-toast';
import { generateFlashcards } from '@/ai/flows/generate-flashcards';
import { generateQuiz } from '@/ai/flows/generate-quiz';
import { Loader } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Settings } from '@/components/Settings';

interface LearnProps {
  view: 'flashcards' | 'quiz';
  isLoading: boolean;
  flashcardSet: FlashcardSet | null;
  quizSet: QuizSet | null;
}

function Learn({ view, isLoading, flashcardSet, quizSet }: LearnProps) {
  return (
     <Card className="w-full bg-transparent shadow-none border-none p-0">
        <div>
            {isLoading && (
              <div className="flex justify-center items-center h-48">
                <Loader className="animate-spin" />
              </div>
            )}
            {!isLoading && view === 'flashcards' && <Flashcards flashcardSet={flashcardSet} />}
            {!isLoading && view === 'quiz' && <Quiz quizSet={quizSet} />}
        </div>
     </Card>
  );
}


export default function Home() {
  const [view, setView] = useState<'flashcards' | 'quiz'>('flashcards');
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [flashcardSet, setFlashcardSet] = useState<FlashcardSet | null>(null);
  const [quizSet, setQuizSet] = useState<QuizSet | null>(null);
  const { toast } = useToast();

  const handleGenerate = useCallback(async (currentTopic: string) => {
    if (!currentTopic.trim()) {
      return;
    }
    setIsLoading(true);
    setFlashcardSet(null);
    setQuizSet(null);

    try {
      const flashcards = await generateFlashcards({ topic: currentTopic });
      setFlashcardSet({ id: 'local-flashcards', topic: currentTopic, cards: flashcards });

      const quiz = await generateQuiz({ topic: currentTopic });
      setQuizSet({ id: 'local-quiz', topic: currentTopic, questions: quiz });

    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to generate content. Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const savedTopic = localStorage.getItem('newTabTopic');
    const savedView = localStorage.getItem('newTabView') as 'flashcards' | 'quiz' | null;
    
    if (savedView) {
      setView(savedView);
    }
    if (savedTopic) {
      setTopic(savedTopic);
      handleGenerate(savedTopic);
    }
  }, [handleGenerate]);

  const onSettingsSave = (newTopic: string, newView: 'flashcards' | 'quiz') => {
    setTopic(newTopic);
    setView(newView);
    handleGenerate(newTopic);
  };


  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-start p-4 sm:p-8 md:p-12 space-y-8">
       <div className="absolute top-4 right-4">
            <Settings onSettingsSave={onSettingsSave} />
        </div>
      <div className="flex flex-col items-center justify-center w-full max-w-xl space-y-8">
        <Clock />
        <Greeting />
        <Search />
      </div>
      <div className="w-full max-w-6xl space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-4">
            <QuickLinks />
          </div>
          <div className="lg:col-span-4 relative">
             <Learn 
                view={view}
                isLoading={isLoading}
                flashcardSet={flashcardSet}
                quizSet={quizSet}
             />
          </div>
        </div>
      </div>
    </main>
  );
}
