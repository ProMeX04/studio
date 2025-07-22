"use client";

import { useState } from 'react';
import { Greeting } from '@/components/Greeting';
import { Search } from '@/components/Search';
import { QuickLinks } from '@/components/QuickLinks';
import { Clock } from '@/components/Clock';
import { Flashcards, FlashcardSet } from '@/components/Flashcards';
import { Quiz, QuizSet } from '@/components/Quiz';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { generateFlashcards } from '@/ai/flows/generate-flashcards';
import { generateQuiz } from '@/ai/flows/generate-quiz';
import { Loader } from 'lucide-react';
import { Card } from '@/components/ui/card';

function Learn() {
  const [view, setView] = useState<'flashcards' | 'quiz'>('flashcards');
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [flashcardSet, setFlashcardSet] = useState<FlashcardSet | null>(null);
  const [quizSet, setQuizSet] = useState<QuizSet | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({ title: 'Error', description: 'Please enter a topic.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    setFlashcardSet(null);
    setQuizSet(null);

    try {
      const flashcards = await generateFlashcards({ topic });
      setFlashcardSet({ id: 'local-flashcards', topic, cards: flashcards });

      const quiz = await generateQuiz({ topic });
      setQuizSet({ id: 'local-quiz', topic, questions: quiz });

      toast({ title: 'Success', description: `Content for "${topic}" generated successfully.` });
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to generate content. Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
     <Card className="w-full bg-transparent shadow-none border-none p-0">
        <div className="flex flex-col sm:flex-row items-center gap-2 p-4 border-b">
            <div className="flex-grow w-full">
                <Input 
                    placeholder="Enter a topic to generate flashcards & quizzes..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                    disabled={isLoading}
                />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
                 <Button onClick={handleGenerate} disabled={isLoading} className="w-full sm:w-auto">
                    {isLoading ? <Loader className="animate-spin" /> : 'Generate'}
                </Button>
                <div className="flex gap-2">
                    <Button variant={view === 'flashcards' ? 'default' : 'outline'} onClick={() => setView('flashcards')}>Flashcards</Button>
                    <Button variant={view === 'quiz' ? 'default' : 'outline'} onClick={() => setView('quiz')}>Quiz</Button>
                </div>
            </div>
        </div>
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
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-start p-4 sm:p-8 md:p-12 space-y-8">
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
          <div className="lg:col-span-4">
            <Learn />
          </div>
        </div>
      </div>
    </main>
  );
}
