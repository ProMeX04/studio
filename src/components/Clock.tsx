
"use client";

import { useState, useEffect } from 'react';

export function Clock() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: 'numeric', hour12: false };
      setTime(now.toLocaleTimeString('vi-VN', options));
    };

    updateClock();
    const timerId = setInterval(updateClock, 1000);

    return () => clearInterval(timerId);
  }, []);

  return (
    <h1 className="text-8xl font-bold tracking-tighter" style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.5)' }}>
      {time}
    </h1>
  );
}
