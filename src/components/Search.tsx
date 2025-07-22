"use client";

import { Search as SearchIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function Search() {
  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = formData.get('q');
    if (typeof query === 'string' && query.trim()) {
      window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    }
  };

  return (
    <form onSubmit={handleSearch} className="max-w-xl mx-auto">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="search"
          name="q"
          placeholder="Search the web..."
          className="pl-10 h-12 text-lg bg-card/80 backdrop-blur-sm"
        />
      </div>
    </form>
  );
}
