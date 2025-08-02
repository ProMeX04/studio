
'use server';
/**
 * @fileOverview Genkit flow to generate a podcast script from theory content.
 */

import { ai } from '@/lib/genkit-service';
import { z } from 'zod';
import { GeneratePodcastScriptInputSchema, GeneratePodcastScriptOutputSchema } from '@/ai/schemas';

export async function generatePodcastScript(input: z.infer<typeof GeneratePodcastScriptInputSchema>): Promise<z.infer<typeof GeneratePodcastScriptOutputSchema>> {
  const prompt = ai.definePrompt({
    name: 'generatePodcastScriptPrompt',
    input: { schema: GeneratePodcastScriptInputSchema },
    output: { schema: GeneratePodcastScriptOutputSchema },
    prompt: `
      You are a professional podcast scriptwriter. Convert the following theory content for the chapter "{{chapterTitle}}" on the topic of "{{topic}}" into an engaging and clear podcast script.

      The script should be in {{language}}.

      **Script requirements:**
      1.  **Introduction:** Start with a catchy intro that grabs the listener's attention and introduces the chapter's topic.
      2.  **Main Content:** Break down the theory into a conversational format. Use clear language, explain jargon, and use analogies if possible. Structure it like a monologue or a two-person dialogue (Host and Expert).
      3.  **Sound Effects (Optional):** You can suggest sound effects in brackets, like [upbeat intro music] or [sound of a cash register].
      4.  **Conclusion:** Summarize the key takeaways from the chapter and provide a brief teaser for the next topic.
      5.  **Tone:** The tone should be informative yet entertaining.

      **Theory Content to Convert:**
      ---
      {{{theoryContent}}}
      ---
    `,
  });

  const { output } = await prompt(input);
  return output ?? { script: '' };
}
