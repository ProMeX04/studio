
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
import { getDb, LabeledData, clearAllData, AppData } from '@/lib/idb';
import { Button } from '@/components/ui/button';
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
  });
  const [backgroundImage, setBackgroundImage] = useState('');
  const [uploadedBackgrounds, setUploadedBackgrounds] = useState<string[]>([]);

  const handleGenerate = useCallback(async (currentTopic: string, currentCount: number, currentLanguage: string, forceNew: boolean = false) => {
    if (!currentTopic.trim()) {
      return;
    }
    
    setIsLoading(true);

    if (forceNew) {
      const db = await getDb();
      await db.delete('data', 'flashcards');
      await db.delete('data', 'quiz');
    }
    
    try {
      const db = await getDb();
      const flashcardData = await db.get('data', 'flashcards') as LabeledData<FlashcardSet>;
      const quizData = await db.get('data', 'quiz') as LabeledData<QuizSet>;

      if (flashcardData && quizData && flashcardData.topic === currentTopic && !forceNew) {
        setFlashcardSet(flashcardData.data);
        setQuizSet(quizData.data);
      } else {
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
    async function loadInitialData() {
        const db = await getDb();

        const savedView = (await db.get('data', 'view'))?.data as 'flashcards' | 'quiz' || 'flashcards';
        const savedTopic = (await db.get('data', 'topic'))?.data as string || 'Roman History';
        const savedCount = (await db.get('data', 'count'))?.data as number || 5;
        const savedLanguage = (await db.get('data', 'language'))?.data as string || 'English';
        const savedVisibility = (await db.get('data', 'visibility'))?.data as ComponentVisibility;
        const savedBg = (await db.get('data', 'background'))?.data as string;
        const savedUploadedBgs = (await db.get('data', 'uploadedBackgrounds'))?.data as string[] || [];

        if (savedBg) setBackgroundImage(savedBg);
        setUploadedBackgrounds(savedUploadedBgs);
        
        setView(savedView);
        setTopic(savedTopic);
        setCount(savedCount);
        setLanguage(savedLanguage);
        setVisibility(savedVisibility ?? {
            clock: true,
            greeting: true,
            search: true,
            quickLinks: true,
            learn: true,
        });
        
        handleGenerate(savedTopic, savedCount, savedLanguage);
    }
    loadInitialData();
  }, [handleGenerate]);

  const onSettingsSave = async (settings: {
    topic: string;
    count: number;
    language: string;
    background: string | null | undefined;
    uploadedBackgrounds: string[];
  }) => {
      const { topic: newTopic, count: newCount, language: newLanguage, background: newBg, uploadedBackgrounds: newUploadedBgs } = settings;
      
      const topicChanged = newTopic !== topic;
      setTopic(newTopic);
      setCount(newCount);
      setLanguage(newLanguage);
      setUploadedBackgrounds(newUploadedBgs);

      const db = await getDb();
      await db.put('data', { id: 'topic', data: newTopic });
      await db.put('data', { id: 'count', data: newCount });
      await db.put('data', { id: 'language', data: newLanguage });
      await db.put('data', { id: 'uploadedBackgrounds', data: newUploadedBgs });

      if (newBg === null) {
        setBackgroundImage('');
        await db.delete('data', 'background');
      } else if (newBg !== undefined) {
        setBackgroundImage(newBg);
        await db.put('data', { id: 'background', data: newBg });
      }
      
      if (topicChanged) {
        handleGenerate(newTopic, newCount, newLanguage, true);
      }
  };
  
  const handleVisibilityChange = async (newVisibility: ComponentVisibility) => {
    setVisibility(newVisibility);
    const db = await getDb();
    await db.put('data', { id: 'visibility', data: newVisibility });
  };
  
  const handleViewChange = async (newView: 'flashcards' | 'quiz') => {
    setView(newView);
    const db = await getDb();
    await db.put('data', { id: 'view', data: newView });
  }

  const onGenerateNew = () => {
     handleGenerate(topic, count, language, true);
  }

  return (
    <main className={cn(
        "relative flex min-h-screen w-full flex-col items-center justify-start p-4 sm:p-8 md:p-12 space-y-8"
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
            {visibility.greeting && <Greeting />}
            <Settings 
              onSettingsSave={onSettingsSave} 
              onVisibilityChange={handleVisibilityChange} 
              onViewChange={handleViewChange} 
            />
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
