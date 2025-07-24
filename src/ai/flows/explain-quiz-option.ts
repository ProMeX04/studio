
'use server';

/**
 * @fileOverview Flow to explain a specific quiz answer option.
 *
 * - explainQuizOption - A function that generates an explanation for a given quiz option.
 */

import {ai} from '@/ai/genkit';
import { ExplainQuizOptionInputSchema, ExplainQuizOptionOutputSchema, type ExplainQuizOptionInput, type ExplainQuizOptionOutput } from '@/ai/schemas';

// Regex to find and replace non-standard backticks with standard ones.
const backtickRegex = /`|´|‘|’/g;

export async function explainQuizOption(input: ExplainQuizOptionInput): Promise<ExplainQuizOptionOutput> {
  return explainQuizOptionFlow(input);
}

const explanationOnlySchema = ExplainQuizOptionOutputSchema.pick({ explanation: true });

const correctAnswerPrompt = ai.definePrompt({
  name: 'correctAnswerPrompt',
  input: {schema: ExplainQuizOptionInputSchema},
  output: {schema: explanationOnlySchema},
  prompt: `You are a helpful quiz tutor. The user has chosen the CORRECT answer and wants a more detailed explanation.

Topic: {{{topic}}}
Question: "{{{question}}}"
Correct Answer: "{{{correctAnswer}}}"

Please provide a more in-depth explanation of why "{{{selectedOption}}}" is the correct answer for the question "{{{question}}}". You can provide additional context or interesting facts related to the topic.

IMPORTANT: Your response MUST be a valid JSON object with a single key "explanation". The "explanation" field must contain valid standard Markdown.
- Use standard backticks (\`) for inline code blocks (e.g., \`my_variable\`).
- Use triple backticks with a language identifier for multi-line code blocks (e.g., \`\`\`python... \`\`\`).
- For mathematical notations, use standard LaTeX syntax: $...$ for inline math and $$...$$ for block-level math.
- For example: {"explanation": "The method \`pop()\` removes and returns the element at the given index. In this case, it removes the element at index 1, which is **20**."}
Ensure the explanation is well-structured with clear paragraphs.
`,
});

const incorrectAnswerPrompt = ai.definePrompt({
    name: 'incorrectAnswerPrompt',
    input: {schema: ExplainQuizOptionInputSchema},
    output: {schema: explanationOnlySchema},
    prompt: `You are a helpful quiz tutor. The user has chosen an INCORRECT answer and wants to know why it's wrong.

Topic: {{{topic}}}
Question: "{{{question}}}"
Correct Answer: "{{{correctAnswer}}}"
The Incorrect Option to Explain: "{{{selectedOption}}}"

Please explain specifically why "{{{selectedOption}}}" is not the correct answer for the question "{{{question}}}".

IMPORTANT: Your response MUST be a valid JSON object with a single key "explanation". The "explanation" field must contain valid standard Markdown.
- Use standard backticks (\`) for inline code blocks (e.g., \`my_variable\`).
- Use triple backticks with a language identifier for multi-line code blocks (e.g., \`\`\`python... \`\`\`).
- For mathematical notations, use standard LaTeX syntax: $...$ for inline math and $$...$$ for block-level math.
- For example: {"explanation": "While that's a good thought, the correct answer is actually **20**. The method \`pop(1)\` specifically targets the element at index 1."}
Ensure the explanation is well-structured with clear paragraphs.
`,
});


const explainQuizOptionFlow = ai.defineFlow(
  {
    name: 'explainQuizOptionFlow',
    inputSchema: ExplainQuizOptionInputSchema,
    outputSchema: ExplainQuizOptionOutputSchema,
  },
  async input => {
    let explanationOutput;
    if (input.selectedOption === input.correctAnswer) {
        const {output} = await correctAnswerPrompt(input);
        explanationOutput = output;
    } else {
        const {output} = await incorrectAnswerPrompt(input);
        explanationOutput = output;
    }

    if (!explanationOutput) {
        throw new Error('Could not generate an explanation.');
    }
    
    // Clean the explanation to ensure proper markdown rendering.
    explanationOutput.explanation = explanationOutput.explanation.replace(backtickRegex, '`');

    return {
        explanation: explanationOutput.explanation,
    };
  }
);
