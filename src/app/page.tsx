import { Greeting } from '@/components/Greeting';
import { Search } from '@/components/Search';
import { QuickLinks } from '@/components/QuickLinks';
import { Clock } from '@/components/Clock';
import { Logo } from '@/components/Logo';

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center p-4 sm:p-8 md:p-12">
      <div className="flex flex-col items-center justify-center w-full max-w-xl space-y-8">
        <Clock />
        <Greeting />
        <Search />
        <QuickLinks />
      </div>
      <Logo />
    </main>
  );
}
