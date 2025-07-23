
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Greeting } from '@/components/Greeting';
import { Search } from '@/components/Search';
import { QuickLinks } from '@/components/QuickLinks';
import { Clock } from '@/components/Clock';
import { Flashcards, FlashcardSet } from '@/components/Flashcards';
import { Quiz, QuizSet, QuizState } from '@/components/Quiz';
import { useToast } from '@/hooks/use-toast';
import { generateFlashcards } from '@/ai/flows/generate-flashcards';
import { generateQuiz } from '@/ai/flows/generate-quiz';
import { Loader } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Settings } from '@/components/Settings';
import { getDb, LabeledData, AppData } from '@/lib/idb';
import { ChatAssistant } from '@/components/ChatAssistant';
import type { QuizQuestion } from '@/ai/schemas';

const BATCH_SIZE = 10;

interface LearnProps {
  view: 'flashcards' | 'quiz';
  isLoading: boolean;
  flashcardSet: FlashcardSet | null;
  quizSet: QuizSet | null;
  quizState: QuizState | null;
  onGenerateNew: (forceNew: boolean) => void;
  generationProgress: number;
  targetCount: number;
  displayCount: number;
  onQuizStateChange: (newState: QuizState) => void;
  flashcardIsRandom: boolean;
  onFlashcardPageChange: (page: number) => void;
  flashcardCurrentPage: number;
}

function Learn({ view, isLoading, flashcardSet, quizSet, quizState, onGenerateNew, targetCount, displayCount, onQuizStateChange, flashcardIsRandom, onFlashcardPageChange, flashcardCurrentPage }: LearnProps) {
    const { toast } = useToast();
    const currentCount = view === 'flashcards' ? flashcardSet?.cards.length || 0 : quizSet?.questions.length || 0;
    const canGenerateMore = currentCount < targetCount;

    const handleGenerateClick = () => {
        if (canGenerateMore) {
             onGenerateNew(false); // Never force new, always append
        } else {
             toast({
                title: "Đã đạt số lượng tối đa",
                description: "Vui lòng tăng số lượng tối đa trong cài đặt để tạo thêm.",
             });
        }
    }
    
    const hasLearnContent = (view === 'flashcards' && flashcardSet && flashcardSet.cards.length > 0) || 
                            (view === 'quiz' && quizSet && quizSet.questions.length > 0);

    return (
     <Card className="w-full bg-transparent shadow-none border-none p-0 relative min-h-[300px]">
        <CardContent className="pt-8">
            {isLoading && !hasLearnContent && (
                 <div className="flex flex-col justify-center items-center h-48">
                    <Loader className="animate-spin mb-4" />
                    <p>Đang tạo nội dung mới cho chủ đề của bạn...</p>
                 </div>
            )}
            
            {view === 'flashcards' && (
                <Flashcards flashcardSet={flashcardSet} displayCount={displayCount} isRandom={flashcardIsRandom} onPageChange={onFlashcardPageChange} initialPage={flashcardCurrentPage} />
            )}
            {view === 'quiz' && (
                <Quiz quizSet={quizSet} initialState={quizState} onStateChange={onQuizStateChange} />
            )}
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
  const [flashcardMax, setFlashcardMax] = useState(50);
  const [quizMax, setQuizMax] = useState(50);
  const [flashcardDisplayMax, setFlashcardDisplayMax] = useState(10);
  const [quizDisplayMax, setQuizDisplayMax] = useState(10);
  const [flashcardIsRandom, setFlashcardIsRandom] = useState(false);
  const [flashcardCurrentPage, setFlashcardCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [flashcardSet, setFlashcardSet] = useState<FlashcardSet | null>(null);
  const [quizSet, setQuizSet] = useState<QuizSet | null>(null);
  const [quizState, setQuizState] = useState<QuizState | null>(null);
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
  const [isMounted, setIsMounted] = useState(false);
  const [assistantContext, setAssistantContext] = useState('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
      setFlashcardSet(null);
      setQuizSet(null);
      setQuizState(null);
      await db.delete('data', 'flashcards');
      await db.delete('data', 'quiz');
      await db.delete('data', 'quizState');
    } else {
      const flashcardData = await db.get('data', 'flashcards') as LabeledData<FlashcardSet>;
      const quizData = await db.get('data', 'quiz') as LabeledData<QuizSet>;
      if (flashcardData && flashcardData.topic === currentTopic) {
        currentFlashcards = flashcardData.data;
      }
      if (quizData && quizData.topic === currentTopic) {
        currentQuiz = quizData.data;
      }
    }
    
    setFlashcardSet(currentFlashcards);
    setQuizSet(currentQuiz);
    
    try {
        const flashcardsNeeded = flashcardMax - currentFlashcards.cards.length;
        const quizNeeded = quizMax - currentQuiz.questions.length;

        if (flashcardsNeeded <= 0 && quizNeeded <= 0) {
            setIsLoading(false);
            return;
        }

        const flashcardBatches = Math.ceil(Math.max(0, flashcardsNeeded) / BATCH_SIZE);
        const quizBatches = Math.ceil(Math.max(0, quizNeeded) / BATCH_SIZE);
        const totalBatches = Math.max(flashcardBatches, quizBatches);


        if (totalBatches <= 0) {
            setIsLoading(false);
            return;
        }

        for (let i = 0; i < totalBatches; i++) {
            const numToGenerateFlashcards = Math.min(BATCH_SIZE, flashcardMax - currentFlashcards.cards.length);
            const numToGenerateQuiz = Math.min(BATCH_SIZE, quizMax - currentQuiz.questions.length);

            const promises = [];
            if (numToGenerateFlashcards > 0) {
                promises.push(generateFlashcards({ topic: currentTopic, count: numToGenerateFlashcards, language: currentLanguage, existingCards: currentFlashcards.cards }));
            } else {
                promises.push(Promise.resolve([]));
            }

            if (numToGenerateQuiz > 0) {
                 promises.push(generateQuiz({ topic: currentTopic, count: numToGenerateQuiz, language: currentLanguage, existingQuestions: currentQuiz.questions }));
            } else {
                 promises.push(Promise.resolve([]));
            }
            
            const [newFlashcards, newQuiz] = await Promise.all(promises);

            if (newFlashcards.length > 0) {
              currentFlashcards.cards.push(...newFlashcards);
              setFlashcardSet({ ...currentFlashcards });
              await db.put('data', { id: 'flashcards', topic: currentTopic, data: currentFlashcards });
            }

            if (newQuiz.length > 0) {
              currentQuiz.questions.push(...newQuiz);
              setQuizSet({ ...currentQuiz });
              await db.put('data', { id: 'quiz', topic: currentTopic, data: currentQuiz });
            }

            setGenerationProgress(((i + 1) / totalBatches) * 100);
        }

    } catch (error) {
      console.error(error);
      toast({ title: 'Lỗi', description: 'Không thể tạo nội dung. Vui lòng thử lại.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast, flashcardMax, quizMax]);

  const loadInitialData = useCallback(async () => {
        const db = await getDb();

        const savedView = (await db.get('data', 'view'))?.data as 'flashcards' | 'quiz' || 'flashcards';
        const savedTopic = (await db.get('data', 'topic'))?.data as string || 'Lịch sử La Mã';
        const savedLanguage = (await db.get('data', 'language'))?.data as string || 'Vietnamese';
        const savedFlashcardMax = (await db.get('data', 'flashcardMax'))?.data as number || 50;
        const savedQuizMax = (await db.get('data', 'quizMax'))?.data as number || 50;
        const savedFlashcardDisplayMax = (await db.get('data', 'flashcardDisplayMax'))?.data as number || 10;
        const savedQuizDisplayMax = (await db.get('data', 'quizDisplayMax'))?.data as number || 10;
        const savedFlashcardIsRandom = (await db.get('data', 'flashcardIsRandom'))?.data as boolean || false;
        const savedFlashcardCurrentPage = (await db.get('data', 'flashcardCurrentPage'))?.data as number || 0;
        const savedVisibility = (await db.get('data', 'visibility'))?.data as ComponentVisibility;
        const savedBg = (await db.get('data', 'background'))?.data as string;
        const savedUploadedBgs = (await db.get('data', 'uploadedBackgrounds'))?.data as string[] || [];
        
        const flashcardData = await db.get('data', 'flashcards') as LabeledData<FlashcardSet>;
        const quizData = await db.get('data', 'quiz') as LabeledData<QuizSet>;
        const quizStateData = await db.get('data', 'quizState') as AppData<QuizState>;

        if (savedBg) setBackgroundImage(savedBg);
        setUploadedBackgrounds(savedUploadedBgs);
        
        setView(savedView);
        setTopic(savedTopic);
        setLanguage(savedLanguage);
        setFlashcardMax(savedFlashcardMax);
        setQuizMax(savedQuizMax);
        setFlashcardDisplayMax(savedFlashcardDisplayMax);
        setQuizDisplayMax(savedQuizDisplayMax);
        setFlashcardIsRandom(savedFlashcardIsRandom);
        setFlashcardCurrentPage(savedFlashcardCurrentPage);
        setVisibility(savedVisibility ?? {
            clock: true,
            greeting: true,
            search: true,
            quickLinks: true,
            learn: true,
        });
        
        const currentFlashcards = (flashcardData && flashcardData.topic === savedTopic) ? flashcardData.data : null;
        const currentQuiz = (quizData && quizData.topic === savedTopic) ? quizData.data : null;

        setFlashcardSet(currentFlashcards);
        setQuizSet(currentQuiz);

        if (quizData && quizData.topic === savedTopic && quizStateData) {
            setQuizState(quizStateData.data);
        } else {
            setQuizState(null);
        }

        const flashcardsNeeded = savedFlashcardMax - (currentFlashcards?.cards.length ?? 0);
        const quizNeeded = savedQuizMax - (currentQuiz?.questions.length ?? 0);

        if (savedTopic && (flashcardsNeeded > 0 || quizNeeded > 0)) {
           handleGenerate(savedTopic, savedLanguage, false);
        }
  }, [handleGenerate]);

  useEffect(() => {
    if (isMounted) {
      loadInitialData();
    }
  }, [isMounted, loadInitialData]);

  const onSettingsSave = useCallback(async (settings: {
    topic: string;
    language: string;
    flashcardMax: number;
    quizMax: number;
    flashcardDisplayMax: number;
    quizDisplayMax: number;
  }) => {
      const { topic: newTopic, language: newLanguage, flashcardMax: newFlashcardMax, quizMax: newQuizMax, flashcardDisplayMax: newFlashcardDisplayMax, quizDisplayMax: newQuizDisplayMax } = settings;
      
      const topicChanged = newTopic !== topic || newLanguage !== language;
      const countsChanged = newFlashcardMax !== flashcardMax || newQuizMax !== quizMax;
      
      setTopic(newTopic);
      setLanguage(newLanguage);
      setFlashcardMax(newFlashcardMax);
      setQuizMax(newQuizMax);
      setFlashcardDisplayMax(newFlashcardDisplayMax);
      setQuizDisplayMax(newQuizDisplayMax);

      const db = await getDb();
      await db.put('data', { id: 'topic', data: newTopic });
      await db.put('data', { id: 'language', data: newLanguage });
      await db.put('data', { id: 'flashcardMax', data: newFlashcardMax });
      await db.put('data', { id: 'quizMax', data: newQuizMax });
      await db.put('data', { id: 'flashcardDisplayMax', data: newFlashcardDisplayMax });
      await db.put('data', { id: 'quizDisplayMax', data: newQuizDisplayMax });
      
      if (topicChanged) {
        handleGenerate(newTopic, newLanguage, true);
      } else if (countsChanged) {
        handleGenerate(newTopic, newLanguage, false);
      }
  }, [topic, language, flashcardMax, quizMax, handleGenerate, flashcardDisplayMax, quizDisplayMax]);

  const handleBackgroundChange = useCallback(async (newBg: string | null) => {
    const db = await getDb();
    if (newBg) {
      setBackgroundImage(newBg);
      await db.put('data', { id: 'background', data: newBg });
    } else {
      setBackgroundImage('');
      await db.delete('data', 'background');
    }
  }, []);

  const handleUploadedBackgroundsChange = useCallback(async (newUploadedBgs: string[]) => {
    setUploadedBackgrounds(newUploadedBgs);
    const db = await getDb();
    await db.put('data', { id: 'uploadedBackgrounds', data: newUploadedBgs });
  }, []);
  
  const handleVisibilityChange = useCallback(async (newVisibility: ComponentVisibility) => {
    setVisibility(newVisibility);
    const db = await getDb();
    await db.put('data', { id: 'visibility', data: newVisibility });
  }, []);
  
  const handleViewChange = useCallback(async (newView: 'flashcards' | 'quiz') => {
    setView(newView);
    const db = await getDb();
    await db.put('data', { id: 'view', data: newView });
  }, []);

  const handleQuizStateChange = useCallback(async (newState: QuizState) => {
    setQuizState(newState);
    const db = await getDb();
    await db.put('data', { id: 'quizState', data: newState });
  }, []);

  const onGenerateNew = useCallback((forceNew: boolean) => {
     handleGenerate(topic, language, forceNew);
  }, [handleGenerate, topic, language]);

  const handleFlashcardSettingsChange = useCallback(async (settings: { isRandom: boolean }) => {
    setFlashcardIsRandom(settings.isRandom);
    const db = await getDb();
    await db.put('data', { id: 'flashcardIsRandom', data: settings.isRandom });
  }, []);

  const handleFlashcardPageChange = useCallback(async (page: number) => {
    setFlashcardCurrentPage(page);
    const db = await getDb();
    await db.put('data', { id: 'flashcardCurrentPage', data: page });
  }, []);

  const currentQuizAnswer = quizState?.answers?.[quizState.currentQuestionIndex]?.selected ?? null;

  useEffect(() => {
    const getAssistantContext = (): string => {
        let context = `Người dùng đang học về chủ đề: ${topic}.`;
        if (view === 'quiz' && quizSet && quizState) {
            const currentQuestion: QuizQuestion | undefined = quizSet.questions[quizState.currentQuestionIndex];
            if (currentQuestion) {
                context += ` Họ đang ở câu hỏi trắc nghiệm: "${currentQuestion.question}" với các lựa chọn: ${currentQuestion.options.join(', ')}. Câu trả lời đúng là ${currentQuestion.answer}.`;
                const userAnswer = quizState.answers[quizState.currentQuestionIndex]?.selected;
                if (userAnswer) {
                     context += ` Người dùng đã chọn "${userAnswer}".`;
                }
            }
        } else if (view === 'flashcards' && flashcardSet?.cards.length > 0) {
            const cardContext = flashcardSet.cards.map(card => `Mặt trước: "${card.front}", Mặt sau: "${card.back}"`).join('; ');
            context += ` Họ đang xem các flashcard sau: ${cardContext}.`;
        }
        return context;
      }

      setAssistantContext(getAssistantContext());

  }, [view, topic, flashcardSet, quizSet, quizState?.currentQuestionIndex, currentQuizAnswer]);


  const targetCount = view === 'flashcards' ? flashcardMax : quizMax;
  const displayCount = view === 'flashcards' ? flashcardDisplayMax : quizDisplayMax;
  
  const displayedFlashcardSet = flashcardSet ? { ...flashcardSet, cards: flashcardSet.cards } : null;
  const displayedQuizSet = quizSet ? { ...quizSet, questions: quizSet.questions } : null;

  if (!isMounted) {
    return null;
  }

  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-start p-4 sm:p-8 md:p-12 space-y-8">
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
              onBackgroundChange={handleBackgroundChange}
              onUploadedBackgroundsChange={handleUploadedBackgroundsChange}
              onFlashcardSettingsChange={handleFlashcardSettingsChange}
              onViewChange={handleViewChange}
              currentView={view}
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
                    flashcardSet={displayedFlashcardSet}
                    quizSet={displayedQuizSet}
                    quizState={quizState}
                    onGenerateNew={onGenerateNew}
                    generationProgress={generationProgress}
                    targetCount={targetCount}
                    displayCount={displayCount}
                    onQuizStateChange={handleQuizStateChange}
                    flashcardIsRandom={flashcardIsRandom}
                    onFlashcardPageChange={handleFlashcardPageChange}
                    flashcardCurrentPage={flashcardCurrentPage}
                />
              </div>
          )}
        </div>
        {visibility.learn && (
            <div className="lg:col-span-4">
                <ChatAssistant context={assistantContext} />
            </div>
        )}
      </div>
    </main>
  );
}
