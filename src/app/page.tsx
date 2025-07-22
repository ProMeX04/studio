import { Greeting } from '@/components/Greeting';
import { Search } from '@/components/Search';
import { GeminiInteraction } from '@/components/GeminiInteraction';
import { QuickLinks } from '@/components/QuickLinks';
import { QuickNotes } from '@/components/QuickNotes';
import { Flashcards } from '@/components/Flashcards';
import { Quiz } from '@/components/Quiz';

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center p-4 sm:p-8 md:p-12">
      <div className="w-full max-w-6xl space-y-8">
        <div className="text-center space-y-4">
          <Greeting />
          <Search />
          <GeminiInteraction />
        </div>

        <div className="w-full">
           <QuickLinks />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <QuickNotes />
          </div>
          <div className="lg:col-span-1">
            <Flashcards />
          </div>
          <div className="lg:col-span-1">
            <Quiz />
          </div>
        </div>
      </div>
    </main>
  );
}
