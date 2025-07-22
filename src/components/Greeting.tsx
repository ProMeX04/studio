"use client";

import { useState, useEffect } from 'react';

export function Greeting() {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good morning');
    } else if (hour < 18) {
      setGreeting('Good afternoon');
    } else {
      setGreeting('Good evening');
    }
  }, []);

  return (
    <h1 className="text-4xl md:text-5xl font-headline font-bold text-foreground/90">
      {greeting}
    </h1>
  );
}
