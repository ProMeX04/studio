
"use client";

import { Search as SearchIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function Search({ hasBackground }: { hasBackground: boolean }) {
  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = formData.get('q');
    if (typeof query === 'string' && query.trim()) {
      window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    }
  };

  return (
    <form onSubmit={handleSearch} className="w-full">
      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="search"
          name="q"
          placeholder="Search the web..."
          className={cn(
            "pl-12 h-14 text-base rounded-full border-none focus-visible:ring-2 focus-visible:ring-ring",
            hasBackground ? "bg-black/20 text-primary-foreground placeholder:text-primary-foreground/70" : "bg-secondary/70"
            )}
        />
      </div>
    </form>
  );
}
