import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Validate API key at startup
if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}

export const ai = genkit({
  plugins: [googleAI({
    apiKey: process.env.GEMINI_API_KEY,
  })],
  model: 'googleai/gemini-2.5-flash-lite',
});
