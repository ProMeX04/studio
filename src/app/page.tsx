"use client";

import { useState } from 'react';
import { Greeting } from '@/components/Greeting';
import { Search } from '@/components/Search';
import { QuickLinks } from '@/components/QuickLinks';
import { Clock } from '@/components/Clock';
import { Logo } from '@/components/Logo';
import { Flashcards } from '@/components/Flashcards';
import { Quiz } from '@/components/Quiz';
import { Button } from '@/components/ui/button';
import { BookOpen, FileQuestion } from 'lucide-react';

type LearnMode = 'flashcards' | 'quiz';

export default function Home() {
  const [learnMode, setLearnMode] = useState<LearnMode>('flashcards');

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
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Learn
              </h2>
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
            {learnMode === 'flashcards' ? <Flashcards /> : <Quiz />}
          </div>
        </div>
      </div>
      <Logo />
    </main>
  );
}
