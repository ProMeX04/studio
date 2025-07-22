"use client";

import { useState, useEffect } from 'react';

export function Greeting() {
  const [greeting, setGreeting] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    const today = new Date();
    const hour = today.getHours();
    
    if (hour < 12) {
      setGreeting('Good Morning');
    } else if (hour < 18) {
      setGreeting('Good Afternoon');
    } else {
      setGreeting('Good Evening');
    }

    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
    setDate(`, it's ${today.toLocaleDateString('en-US', options)}.`);

  }, []);

  return (
    <p className="text-xl text-muted-foreground -mt-6">
      {greeting}{date}
    </p>
  );
}
