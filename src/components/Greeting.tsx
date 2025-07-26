
"use client";

import { useState, useEffect } from 'react';

export function Greeting() {
  const [greeting, setGreeting] = useState('');
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
    setGreeting(greetingText + dateText);
  }, [isMounted]);

  if (!isMounted) {
    return null;
  }

  return (
    <p className="text-xl relative text-foreground/80 text-shadow">
      {greeting}
    </p>
  );
}
