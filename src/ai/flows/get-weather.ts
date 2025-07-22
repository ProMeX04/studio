'use server';

/**
 * @fileOverview A flow to get weather information for a given location.
 *
 * - getWeather - A function that returns the weather for a location.
 * - GetWeatherInput - The input type for the getWeather function.
 * - WeatherData - The return type for the getWeather function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { tool } from 'genkit/tool';

const GetWeatherInputSchema = z.object({
  location: z.string().describe('The location for which to get the weather, e.g. "Mountain View, CA" or a lat/long.'),
});

export type GetWeatherInput = z.infer<typeof GetWeatherInputSchema>;

export const WeatherDataSchema = z.object({
  temperature: z.number().describe('The temperature in Celsius.'),
  condition: z.string().describe('A brief description of the weather conditions (e.g., "Sunny", "Cloudy").'),
  location: z.string().describe('The location name identified from the input, e.g. "Mountain View, CA".'),
});

export type WeatherData = z.infer<typeof WeatherDataSchema>;

const weatherTool = tool(
  {
    name: 'getWeather',
    description: 'Get the current weather for a location. Use Celsius for temperature.',
    input: GetWeatherInputSchema,
    output: WeatherDataSchema,
  },
  async ({ location }) => {
    // In a real app, you would call a weather API here.
    // For this example, we'll return mock data.
    // We'll also simulate location resolution.
    
    // Simple check to see if it's lat/long
    if (location.match(/-?\d+\.\d+,-?\d+\.\d+/)) {
        // Let's pretend this is a location lookup
        const mockLocations: {[key: string]: WeatherData} = {
            "37.7749,-122.4194": { temperature: 18, condition: 'Cloudy', location: 'San Francisco' },
            "40.7128,-74.0060": { temperature: 25, condition: 'Sunny', location: 'New York' },
            "34.0522,-118.2437": { temperature: 28, condition: 'Sunny', location: 'Los Angeles' },
        }
        const closest = Object.keys(mockLocations)[0]; // Just pick one for demo
        return mockLocations[closest];
    }

    // Otherwise, assume it's a city name
    const mockData: {[key: string]: WeatherData} = {
      'mountain view, ca': { temperature: 22, condition: 'Sunny', location: 'Mountain View' },
      'london': { temperature: 15, condition: 'Rain', location: 'London' },
      'tokyo': { temperature: 28, condition: 'Cloudy', location: 'Tokyo' },
    };
    const key = location.toLowerCase();
    return mockData[key] || { temperature: 20, condition: 'Clear', location: location };
  }
);


export async function getWeather(input: GetWeatherInput): Promise<WeatherData> {
    const { output } = await ai.generate({
        prompt: `What is the weather in ${input.location}?`,
        tools: [weatherTool],
        model: 'googleai/gemini-pro', // Specify a model that supports tool use
    });
    
    if (!output) {
      throw new Error('AI failed to generate a response.');
    }

    const weatherToolCall = output.tools[0];
    if (weatherToolCall?.name === 'getWeather' && weatherToolCall.output) {
        return weatherToolCall.output;
    }

    throw new Error('Failed to get weather data from the tool.');
}
