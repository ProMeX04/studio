
"use client";

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export function Greeting() {
  const [fullGreeting, setFullGreeting] = useState('');
  const [typedGreeting, setTypedGreeting] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const today = new Date();
    const hour = today.getHours();
    
    let greetingText;
    if (hour < 12) {
      greetingText = 'Chào buổi sáng';
    } else if (hour < 18) {
      greetingText = 'Chào buổi chiều';
    } else {
      greetingText = 'Chào buổi tối';
    }

    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
    const dateText = `. ${today.toLocaleDateString('vi-VN', options)}.`;
    setFullGreeting(greetingText + dateText);
  }, [isMounted]);

  useEffect(() => {
    // Reset typing effect when greeting changes
    if (isMounted) {
      setTypedGreeting('');
      setIsTyping(true);
    }
  }, [fullGreeting, isMounted]);


  useEffect(() => {
    if (isMounted && isTyping && fullGreeting && typedGreeting.length < fullGreeting.length) {
      const timeoutId = setTimeout(() => {
        setTypedGreeting(fullGreeting.slice(0, typedGreeting.length + 1));
      }, 50);
      return () => clearTimeout(timeoutId);
    } else if (typedGreeting.length === fullGreeting.length && fullGreeting.length > 0) {
        setIsTyping(false);
    }
  }, [fullGreeting, typedGreeting, isTyping, isMounted]);

  if (!isMounted) {
    return null;
  }

  return (
    <p className="text-xl relative text-foreground/80">
      {typedGreeting}
      <span className={cn(
          'ml-1 h-5 w-0.5 bg-current inline-block', 
          isTyping ? 'animate-pulse' : 'hidden'
      )}></span>
    </p>
  );
}
