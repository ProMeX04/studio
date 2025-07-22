
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
import { getDb, LabeledData, AppData } from '@/lib/idb';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const GENERATION_TARGET = 50;
const BATCH_SIZE = 10;

interface LearnProps {
  view: 'flashcards' | 'quiz';
  isLoading: boolean;
  flashcardSet: FlashcardSet | null;
  quizSet: QuizSet | null;
  onGenerateNew: (forceNew: boolean) => void;
  generationProgress: number;
}

function Learn({ view, isLoading, flashcardSet, quizSet, onGenerateNew, generationProgress }: LearnProps) {
    const currentCount = view === 'flashcards' ? flashcardSet?.cards.length || 0 : quizSet?.questions.length || 0;
    const canGenerateMore = currentCount < GENERATION_TARGET;

    const handleGenerateClick = () => {
        // If we have content, clicking the button should either generate more or force a full reset.
        // If we don't have content, it should always start a new generation.
        if (currentCount > 0) {
             onGenerateNew(!canGenerateMore);
        } else {
             onGenerateNew(true);
        }
    }

    const hasContent = (view === 'flashcards' && flashcardSet && flashcardSet.cards.length > 0) || 
                       (view === 'quiz' && quizSet && quizSet.questions.length > 0);
  
    return (
     <Card className="w-full bg-transparent shadow-none border-none p-0 relative">
        {(hasContent || isLoading) && (
           <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button onClick={handleGenerateClick} variant="outline" size="icon" className="absolute top-0 right-0 z-10" disabled={isLoading}>
                        {isLoading ? <Loader className="animate-spin" /> : <RefreshCcw />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                     {isLoading && <p>Generating...</p>}
                     {!isLoading && hasContent && !canGenerateMore && <p>Start New Topic</p>}
                     {!isLoading && hasContent && canGenerateMore && <p>Generate More</p>}
                     {!isLoading && !hasContent && <p>Generate</p>}
                </TooltipContent>
            </Tooltip>
           </TooltipProvider>
        )}
         {hasContent && !isLoading && (
            <div className="absolute top-2 right-12 text-sm text-muted-foreground z-10">
                ({currentCount}/{GENERATION_TARGET})
            </div>
        )}
        <CardContent className="pt-8">
            {isLoading && !hasContent && (
                 <div className="flex flex-col justify-center items-center h-48">
                    <Loader className="animate-spin mb-4" />
                    <p>Generating new content for your topic...</p>
                 </div>
            )}
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
  const [language, setLanguage] = useState('English');
  const [isLoading, setIsLoading] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
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

  const handleGenerate = useCallback(async (currentTopic: string, currentLanguage: string, forceNew: boolean = false) => {
    if (!currentTopic.trim()) {
      return;
    }
    
    setIsLoading(true);
    setGenerationProgress(0);
    const db = await getDb();

    let currentFlashcards: FlashcardSet = { id: 'idb-flashcards', topic: currentTopic, cards: [] };
    let currentQuiz: QuizSet = { id: 'idb-quiz', topic: currentTopic, questions: [] };

    if (forceNew) {
      await db.delete('data', 'flashcards');
      await db.delete('data', 'quiz');
    } else {
      const flashcardData = await db.get('data', 'flashcards') as LabeledData<FlashcardSet>;
      const quizData = await db.get('data', 'quiz') as LabeledData<QuizSet>;
      if (flashcardData && flashcardData.topic === currentTopic) {
        currentFlashcards = flashcardData.data;
        setFlashcardSet(currentFlashcards);
      }
      if (quizData && quizData.topic === currentTopic) {
        currentQuiz = quizData.data;
        setQuizSet(currentQuiz);
      }
    }
    
    setFlashcardSet(currentFlashcards);
    setQuizSet(currentQuiz);
    
    try {
       const totalItems = Math.max(currentFlashcards.cards.length, currentQuiz.questions.length);
       const neededItems = GENERATION_TARGET - totalItems;

        if (neededItems <= 0) {
            setIsLoading(false);
            return;
        }

       const batches = Math.ceil(neededItems / BATCH_SIZE);

        for (let i = 0; i < batches; i++) {
            const numToGenerate = Math.min(BATCH_SIZE, GENERATION_TARGET - Math.max(currentFlashcards.cards.length, currentQuiz.questions.length));
            if (numToGenerate <= 0) continue;

            const flashcardsPromise = generateFlashcards({ topic: currentTopic, count: numToGenerate, language: currentLanguage, existingCards: currentFlashcards.cards });
            const quizPromise = generateQuiz({ topic: currentTopic, count: numToGenerate, language: currentLanguage, existingQuestions: currentQuiz.questions });

            const [newFlashcards, newQuiz] = await Promise.all([flashcardsPromise, quizPromise]);

            currentFlashcards.cards.push(...newFlashcards);
            currentQuiz.questions.push(...newQuiz);

            setFlashcardSet({ ...currentFlashcards });
            setQuizSet({ ...currentQuiz });
            
            await db.put('data', { id: 'flashcards', topic: currentTopic, data: currentFlashcards });
            await db.put('data', { id: 'quiz', topic: currentTopic, data: currentQuiz });

            setGenerationProgress(((i + 1) / batches) * 100);
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
        const savedLanguage = (await db.get('data', 'language'))?.data as string || 'English';
        const savedVisibility = (await db.get('data', 'visibility'))?.data as ComponentVisibility;
        const savedBg = (await db.get('data', 'background'))?.data as string;
        const savedUploadedBgs = (await db.get('data', 'uploadedBackgrounds'))?.data as string[] || [];
        
        const flashcardData = await db.get('data', 'flashcards') as LabeledData<FlashcardSet>;
        const quizData = await db.get('data', 'quiz') as LabeledData<QuizSet>;

        if (savedBg) setBackgroundImage(savedBg);
        setUploadedBackgrounds(savedUploadedBgs);
        
        setView(savedView);
        setTopic(savedTopic);
        setLanguage(savedLanguage);
        setVisibility(savedVisibility ?? {
            clock: true,
            greeting: true,
            search: true,
            quickLinks: true,
            learn: true,
        });
        
        if (flashcardData && flashcardData.topic === savedTopic) {
            setFlashcardSet(flashcardData.data);
        }

        if (quizData && quizData.topic === savedTopic) {
            setQuizSet(quizData.data);
        }
    }
    loadInitialData();
  }, []);

  const onSettingsSave = async (settings: {
    topic: string;
    language: string;
    background: string | null | undefined;
    uploadedBackgrounds: string[];
  }) => {
      const { topic: newTopic, language: newLanguage, background: newBg, uploadedBackgrounds: newUploadedBgs } = settings;
      
      const topicChanged = newTopic !== topic || newLanguage !== language;
      setTopic(newTopic);
      setLanguage(newLanguage);
      setUploadedBackgrounds(newUploadedBgs);

      const db = await getDb();
      await db.put('data', { id: 'topic', data: newTopic });
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
        handleGenerate(newTopic, newLanguage, true);
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

  const onGenerateNew = (forceNew: boolean) => {
     handleGenerate(topic, language, forceNew);
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
                    generationProgress={generationProgress}
                 />
              </div>
          )}
        </div>
      </div>
    </main>
  );
}

    
