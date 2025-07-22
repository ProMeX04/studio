'use server';

/**
 * @fileOverview A simple chat flow to generate a response from a prompt.
 *
 * - generateResponse - A function that generates a response for a given prompt.
 * - GenerateResponseInput - The input type for the generateResponse function.
 * - GenerateResponseOutput - The return type for the generateResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateResponseInputSchema = z.object({
  prompt: z.string().describe('The user\'s prompt.'),
});

export type GenerateResponseInput = z.infer<typeof GenerateResponseInputSchema>;

const GenerateResponseOutputSchema = z.string().describe('The AI\'s response.');

export type GenerateResponseOutput = z.infer<typeof GenerateResponseOutputSchema>;

export async function generateResponse(input: GenerateResponseInput): Promise<GenerateResponseOutput> {
  return generateResponseFlow(input);
}

const generateResponseFlow = ai.defineFlow(
  {
    name: 'generateResponseFlow',
    inputSchema: GenerateResponseInputSchema,
    outputSchema: GenerateResponseOutputSchema,
  },
  async ({ prompt }) => {
    const llmResponse = await ai.generate({
      prompt: `You are a helpful assistant. Respond to the following prompt: ${prompt}`,
    });

    const responseText = llmResponse.text;
    
    // Validate that the output is a string. If not, return an empty string.
    const validationResult = GenerateResponseOutputSchema.safeParse(responseText);
    if (validationResult.success) {
      return validationResult.data;
    } else {
      console.error("AI response validation failed:", validationResult.error);
      return "";
    }
  }
);