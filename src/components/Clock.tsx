"use client";

import { useState, useEffect } from 'react';

export function Clock() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: 'numeric', hour12: true };
      setTime(now.toLocaleTimeString('en-US', options));
    };

    updateClock();
    const timerId = setInterval(updateClock, 1000);

    return () => clearInterval(timerId);
  }, []);

  return (
    <h1 className="text-8xl font-bold text-foreground tracking-tighter">
      {time}
    </h1>
  );
}
