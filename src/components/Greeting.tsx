"use client";

import { useState, useEffect } from 'react';

export function Greeting() {
  const [fullGreeting, setFullGreeting] = useState('');
  const [displayedGreeting, setDisplayedGreeting] = useState('');

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
    if (fullGreeting) {
      let i = 0;
      setDisplayedGreeting('');
      const typingInterval = setInterval(() => {
        if (i < fullGreeting.length) {
          setDisplayedGreeting(prev => prev + fullGreeting.charAt(i));
          i++;
        } else {
          clearInterval(typingInterval);
        }
      }, 50); // Adjust typing speed here

      return () => clearInterval(typingInterval);
    }
  }, [fullGreeting]);


  return (
    <p className="text-xl text-muted-foreground">
      {displayedGreeting}
    </p>
  );
}
