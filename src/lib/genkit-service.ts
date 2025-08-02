
'use server';
/**
 * @fileOverview Centralized Genkit initialization.
 */

import { genkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/googleai';

// Initialize Genkit with the Google AI plugin
export const ai = genkit({
  plugins: [
    googleAI({
      // The API key is automatically picked up from the GEMINI_API_KEY environment variable
    }),
  ],
  logLevel: 'debug',
  enableTracing: true,
});
