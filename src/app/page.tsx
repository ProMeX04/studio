import { Greeting } from '@/components/Greeting';
import { Search } from '@/components/Search';
import { QuickLinks } from '@/components/QuickLinks';
import { Clock } from '@/components/Clock';
import { Logo } from '@/components/Logo';
import { Flashcards } from '@/components/Flashcards';
import { Quiz } from '@/components/Quiz';
import { GeminiInteraction } from '@/components/GeminiInteraction';
import { QuickNotes } from '@/components/QuickNotes';

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-start p-4 sm:p-8 md:p-12 space-y-8">
      <div className="flex flex-col items-center justify-center w-full max-w-xl space-y-8">
        <Clock />
        <Greeting />
        <Search />
      </div>
      <div className="w-full max-w-6xl space-y-8">
        <GeminiInteraction />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <QuickLinks />
          </div>
          <QuickNotes />
          <div className="lg:col-span-4">
            <h2 className="text-2xl font-bold tracking-tight text-foreground mb-4">
              Learn
            </h2>
          </div>
          <div className="lg:col-span-2">
            <Flashcards />
          </div>
           <div className="lg:col-span-2">
            <Quiz />
          </div>
        </div>
      </div>
      <Logo />
    </main>
  );
}
