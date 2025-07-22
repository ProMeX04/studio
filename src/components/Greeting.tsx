"use client";

import { useState, useEffect } from 'react';

export function Greeting() {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const today = new Date();
    const hour = today.getHours();
    
    let greetingText;
    if (hour < 12) {
      greetingText = 'Good Morning';
    } else if (hour < 18) {
      greetingText = 'Good Afternoon';
    } else {
      greetingText = 'Good Evening';
    }

    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
    const dateText = `, it's ${today.toLocaleDateString('en-US', options)}.`;
    setGreeting(greetingText + dateText);
  }, []);

  return (
    <p className="text-xl text-muted-foreground animate-in fade-in duration-1000">
      {greeting}
    </p>
  );
}
