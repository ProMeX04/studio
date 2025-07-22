"use client";

import { useEffect, useState } from 'react';
import { getWeather, WeatherData } from '@/ai/flows/get-weather';
import { Sun, Cloud, CloudRain, Snowflake, Loader, Thermometer, Wind } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const weatherIcons: { [key: string]: React.ReactNode } = {
  sunny: <Sun />,
  clear: <Sun />,
  cloudy: <Cloud />,
  rain: <CloudRain />,
  snow: <Snowflake />,
};

export function Weather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchWeather = () => {
      if (!navigator.geolocation) {
        setError('Geolocation is not supported by your browser.');
        setIsLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const location = `${latitude},${longitude}`;
            const weatherData = await getWeather({ location });
            setWeather(weatherData);
          } catch (err) {
            console.error(err);
            toast({ title: 'Error', description: 'Could not fetch weather data.', variant: 'destructive'});
            setError('Could not fetch weather data.');
          } finally {
            setIsLoading(false);
          }
        },
        () => {
          setError('Unable to retrieve your location.');
          toast({ title: 'Error', description: 'Please enable location services to see the weather.', variant: 'destructive'});
          setIsLoading(false);
        }
      );
    };

    fetchWeather();
  }, [toast]);

  if (isLoading) {
    return <div className="flex items-center gap-2 text-muted-foreground"><Loader className="animate-spin" /> <span>Loading...</span></div>;
  }

  if (error || !weather) {
    return null;
  }

  const weatherIcon = Object.keys(weatherIcons).find(key => 
    weather.condition.toLowerCase().includes(key)
  );

  return (
    <div className="flex items-center gap-3 text-xl text-muted-foreground">
        <div className="flex items-center gap-1">
            {weatherIcon && weatherIcons[weatherIcon]}
            <span>{weather.condition}</span>
        </div>
      <div className="flex items-center gap-1">
        <Thermometer />
        <span>{weather.temperature}°C</span>
      </div>
      <span>in {weather.location}</span>
    </div>
  );
}
