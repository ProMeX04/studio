import {genkit, Genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

/**
 * This function configures and returns a new Genkit instance.
 * It is used by server-side flows to initialize Genkit with the
 * user-provided API key for each request.
 * @param apiKey The user's Gemini API key.
 * @returns A configured Genkit instance.
 */
export function configureGenkit(apiKey: string): Genkit {
  if (!apiKey) {
    // This check is important for security and functionality.
    // Although we also check on the client-side, this server-side
    // validation ensures no calls are made without a key.
    throw new Error('A valid API key is required to configure Genkit.');
  }

  return genkit({
    plugins: [googleAI({
      apiKey: apiKey,
    })],
    model: 'googleai/gemini-2.5-flash-lite',
  });
}
