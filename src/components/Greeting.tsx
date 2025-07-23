
"use client";

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export function Greeting() {
  const [fullGreeting, setFullGreeting] = useState('');
  const [typedGreeting, setTypedGreeting] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
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

    const userName = user?.displayName?.split(' ')[0];
    if (userName) {
        greetingText += `, ${userName}`;
    }

    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
    const dateText = `. Hôm nay là ${today.toLocaleDateString('vi-VN', options)}.`;
    setFullGreeting(greetingText + dateText);
  }, [user]);

  useEffect(() => {
    // Reset typing effect when greeting changes (e.g., after login)
    setTypedGreeting('');
    setIsTyping(true);
  }, [fullGreeting]);


  useEffect(() => {
    if (isTyping && fullGreeting && typedGreeting.length < fullGreeting.length) {
      const timeoutId = setTimeout(() => {
        setTypedGreeting(fullGreeting.slice(0, typedGreeting.length + 1));
      }, 50);
      return () => clearTimeout(timeoutId);
    } else if (typedGreeting.length === fullGreeting.length && fullGreeting.length > 0) {
        setIsTyping(false);
    }
  }, [fullGreeting, typedGreeting, isTyping]);

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
