"use client";

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface GreetingProps {
    hasBackground: boolean;
}

export function Greeting({ hasBackground }: GreetingProps) {
  const [fullGreeting, setFullGreeting] = useState('');
  const [typedGreeting, setTypedGreeting] = useState('');
  const [isTyping, setIsTyping] = useState(true);

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
    setFullGreeting(greetingText + dateText);
  }, []);

  useEffect(() => {
    if (fullGreeting && typedGreeting.length < fullGreeting.length) {
      const timeoutId = setTimeout(() => {
        setTypedGreeting(fullGreeting.slice(0, typedGreeting.length + 1));
      }, 50);
      return () => clearTimeout(timeoutId);
    } else if (typedGreeting.length === fullGreeting.length && fullGreeting.length > 0) {
        setIsTyping(false);
    }
  }, [fullGreeting, typedGreeting]);

  return (
    <p className={cn(
        "text-xl relative",
        hasBackground ? 'text-primary-foreground/80' : 'text-muted-foreground'
    )}>
      {typedGreeting}
      <span className={cn(
          'ml-1 h-5 w-0.5 bg-current inline-block', 
          isTyping ? 'animate-pulse' : 'hidden'
      )}></span>
    </p>
  );
}
