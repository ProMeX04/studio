"use client";

import { useState } from 'react';
import { Greeting } from '@/components/Greeting';
import { Search } from '@/components/Search';
import { QuickLinks } from '@/components/QuickLinks';
import { Clock } from '@/components/Clock';
import { Flashcards } from '@/components/Flashcards';
import { Quiz } from '@/components/Quiz';
import { Button } from '@/components/ui/button';
import { BookOpen, FileQuestion, Loader } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { addFlashcardsToDb } from '@/ai/flows/generate-flashcards';
import { addQuizToDb } from '@/ai/flows/generate-quiz';

type LearnMode = 'flashcards' | 'quiz';

export default function Home() {
  const [learnMode, setLearnMode] = useState<LearnMode>('flashcards');
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({ title: 'Error', description: 'Please enter a topic.', variant: 'destructive' });
      return;
    }
    setIsGenerating(true);
    try {
      // Generate flashcards first
      await addFlashcardsToDb({ topic });
      // Then generate the quiz
      await addQuizToDb({ topic });

      toast({ title: 'Success', description: `Flashcards and quiz for "${topic}" created.` });
      setTopic('');
      setRefreshKey(prev => prev + 1); // Trigger a refresh
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to generate content.', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };


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
            <div className="flex justify-between items-center mb-4 gap-4">
              <div className="flex-grow flex gap-2">
                <Input 
                  placeholder="Enter a topic to generate flashcards and quizzes..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={isGenerating}
                />
                <Button onClick={handleGenerate} disabled={isGenerating}>
                  {isGenerating ? <Loader className="animate-spin" /> : "Generate"}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                  <Button variant={learnMode === 'flashcards' ? 'default' : 'secondary'} onClick={() => setLearnMode('flashcards')}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Flashcards
                  </Button>
                  <Button variant={learnMode === 'quiz' ? 'default' : 'secondary'} onClick={() => setLearnMode('quiz')}>
                    <FileQuestion className="mr-2 h-4 w-4" />
                    Quiz
                  </Button>
              </div>
            </div>
          </div>
          <div className="lg:col-span-4">
            {learnMode === 'flashcards' ? <Flashcards key={refreshKey} /> : <Quiz key={refreshKey} />}
          </div>
        </div>
      </div>
    </main>
  );
}
