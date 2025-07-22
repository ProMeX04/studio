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
import { Loader, RefreshCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Settings } from '@/components/Settings';
import { getDb, LabeledData, clearAllData } from '@/lib/idb';
import { Button } from '@/components/ui/button';
import { Weather } from '@/components/Weather';
import { cn } from '@/lib/utils';

interface LearnProps {
  view: 'flashcards' | 'quiz';
  isLoading: boolean;
  flashcardSet: FlashcardSet | null;
  quizSet: QuizSet | null;
  onGenerateNew: () => void;
}

function Learn({ view, isLoading, flashcardSet, quizSet, onGenerateNew }: LearnProps) {
  if (isLoading) {
    return (
      <Card className="w-full bg-transparent shadow-none border-none p-0">
        <div className="flex justify-center items-center h-48">
          <Loader className="animate-spin" />
        </div>
      </Card>
    );
  }

  const hasContent = (view === 'flashcards' && flashcardSet) || (view === 'quiz' && quizSet);

  return (
     <Card className="w-full bg-transparent shadow-none border-none p-0 relative">
        {hasContent && (
           <Button onClick={onGenerateNew} variant="outline" size="sm" className="absolute top-0 right-0 z-10">
             <RefreshCcw className="mr-2" />
             Generate New
           </Button>
        )}
        <CardContent className="pt-8">
            {view === 'flashcards' && <Flashcards flashcardSet={flashcardSet} />}
            {view === 'quiz' && <Quiz quizSet={quizSet} />}
        </CardContent>
     </Card>
  );
}

export interface ComponentVisibility {
  clock: boolean;
  greeting: boolean;
  search: boolean;
  quickLinks: boolean;
  learn: boolean;
  weather: boolean;
}


export default function Home() {
  const [view, setView] = useState<'flashcards' | 'quiz'>('flashcards');
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5);
  const [language, setLanguage] = useState('English');
  const [isLoading, setIsLoading] = useState(false);
  const [flashcardSet, setFlashcardSet] = useState<FlashcardSet | null>(null);
  const [quizSet, setQuizSet] = useState<QuizSet | null>(null);
  const { toast } = useToast();
  const [visibility, setVisibility] = useState<ComponentVisibility>({
    clock: true,
    greeting: true,
    search: true,
    quickLinks: true,
    learn: true,
    weather: true,
  });
  const [backgroundImage, setBackgroundImage] = useState('');

  const handleGenerate = useCallback(async (currentTopic: string, currentCount: number, currentLanguage: string, forceNew: boolean = false) => {
    if (!currentTopic.trim()) {
      return;
    }
    
    setIsLoading(true);

    if (forceNew) {
      const db = await getDb();
      await clearAllData(db);
    }
    
    try {
      const db = await getDb();
      const flashcardData = await db.get('data', 'flashcards') as LabeledData<FlashcardSet>;
      const quizData = await db.get('data', 'quiz') as LabeledData<QuizSet>;

      if (flashcardData && quizData && flashcardData.topic === currentTopic && !forceNew) {
        setFlashcardSet(flashcardData.data);
        setQuizSet(quizData.data);
      } else {
        await clearAllData(db);
        setFlashcardSet(null);
        setQuizSet(null);

        const flashcardsPromise = generateFlashcards({ topic: currentTopic, count: currentCount, language: currentLanguage });
        const quizPromise = generateQuiz({ topic: currentTopic, count: currentCount, language: currentLanguage });

        const [flashcards, quiz] = await Promise.all([flashcardsPromise, quizPromise]);
        
        const newFlashcardSet: FlashcardSet = { id: 'idb-flashcards', topic: currentTopic, cards: flashcards };
        const newQuizSet: QuizSet = { id: 'idb-quiz', topic: currentTopic, questions: quiz };

        await db.put('data', { id: 'flashcards', topic: currentTopic, data: newFlashcardSet });
        await db.put('data', { id: 'quiz', topic: currentTopic, data: newQuizSet });
        
        setFlashcardSet(newFlashcardSet);
        setQuizSet(newQuizSet);
      }

    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to generate content. Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const savedView = (localStorage.getItem('newTabView') as 'flashcards' | 'quiz') || 'flashcards';
    const savedTopic = localStorage.getItem('newTabTopic') || 'Roman History';
    const savedCount = parseInt(localStorage.getItem('newTabCount') || '5', 10);
    const savedLanguage = localStorage.getItem('newTabLanguage') || 'English';
    const savedVisibility = JSON.parse(localStorage.getItem('newTabVisibility') || '{}');
    const savedBg = localStorage.getItem('newTabBackground');

    if (savedBg) {
      setBackgroundImage(savedBg);
    }

    setView(savedView);
    setTopic(savedTopic);
    setCount(savedCount);
    setLanguage(savedLanguage);
    setVisibility({
        clock: savedVisibility.clock ?? true,
        greeting: savedVisibility.greeting ?? true,
        search: savedVisibility.search ?? true,
        quickLinks: savedVisibility.quickLinks ?? true,
        learn: savedVisibility.learn ?? true,
        weather: savedVisibility.weather ?? true,
    });
    handleGenerate(savedTopic, savedCount, savedLanguage);
  }, [handleGenerate]);

  const onSettingsSave = (newTopic: string, newView: 'flashcards' | 'quiz', newCount: number, newLanguage: string, newVisibility: ComponentVisibility, newBg: string | null) => {
    const topicChanged = newTopic !== topic;
    setTopic(newTopic);
    setView(newView);
    setCount(newCount);
    setLanguage(newLanguage);
    setVisibility(newVisibility);
    
    if (newBg === null) {
      setBackgroundImage('');
      localStorage.removeItem('newTabBackground');
    } else if (newBg) {
      setBackgroundImage(newBg);
      localStorage.setItem('newTabBackground', newBg);
    } else {
        // This case handles when 'newBg' is '', meaning no change from a previous non-null value.
        // We do nothing to keep the existing background.
    }
    
    handleGenerate(newTopic, newCount, newLanguage, topicChanged);
  };
  
  const onGenerateNew = () => {
     handleGenerate(topic, count, language, true);
  }


  return (
    <main className={cn(
        "relative flex min-h-screen w-full flex-col items-center justify-start p-4 sm:p-8 md:p-12 space-y-8",
        backgroundImage && 'text-white'
    )}>
      {backgroundImage && (
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        >
          <div className="absolute inset-0 bg-black/50"></div>
        </div>
      )}
      <div className="absolute top-4 right-4 flex items-center gap-4 z-10">
            {visibility.greeting && <Greeting hasBackground={!!backgroundImage} />}
            {visibility.weather && <Weather hasBackground={!!backgroundImage} />}
            <Settings onSettingsSave={onSettingsSave} />
        </div>
      <div className="flex flex-col items-center justify-center w-full max-w-xl space-y-8 z-10">
        {visibility.clock && <Clock />}
        {visibility.search && <Search />}
      </div>
      <div className="w-full max-w-6xl space-y-8 z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {visibility.quickLinks && (
            <div className="lg:col-span-4">
              <QuickLinks />
            </div>
          )}
          {visibility.learn && (
             <div className="lg:col-span-4 relative">
                 <Learn 
                    view={view}
                    isLoading={isLoading}
                    flashcardSet={flashcardSet}
                    quizSet={quizSet}
                    onGenerateNew={onGenerateNew}
                 />
              </div>
          )}
        </div>
      </div>
    </main>
  );
}
