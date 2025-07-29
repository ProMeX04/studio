
/**
 * @fileOverview Quiz generation flow using Google Generative AI SDK.
 *
 * - generateQuiz - A function that generates a quiz for a given topic.
 */
import { z } from 'zod';
import { GenerationConfig, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { GenerateQuizInputSchema, GenerateQuizOutputContainerSchema, GenerateQuizOutput, GenerateQuizJsonSchema, QuizQuestion } from '@/ai/schemas';
import { performAIOperation } from '@/lib/ai-service';

const GenerateQuizClientInputSchema = GenerateQuizInputSchema.extend({
    apiKeys: z.array(z.string()),
    apiKeyIndex: z.number(),
});
type GenerateQuizClientInput = z.infer<typeof GenerateQuizClientInputSchema>;

export async function generateQuiz(
  input: GenerateQuizClientInput
): Promise<{ result: GenerateQuizOutput; newApiKeyIndex: number }> {
  const { apiKeys, apiKeyIndex, model: modelName, ...promptInput } = input;

  return performAIOperation({
    apiKeys,
    apiKeyIndex,
    operation: async (genAI) => {
        const model = genAI.getGenerativeModel({ model: modelName });

        const existingQuestionsPrompt = promptInput.existingQuestions && promptInput.existingQuestions.length > 0
          ? `
        You have already generated the following questions. Do not repeat them or create questions with very similar content.

        Existing Questions:
        ${promptInput.existingQuestions.map(q => `- "${q.question}"`).join('\n')}
        `
          : '';
          
        const theoryContextPrompt = promptInput.theoryContent
          ? `
        Base the quiz questions EXCLUSIVELY on the following theory content. Do not introduce outside information.
        Theory Content:
        ---
        ${promptInput.theoryContent}
        ---
        `
          : `Generate a quiz for the topic: ${promptInput.topic}.`;

        const promptText = `You are a quiz generator. Generate a ${promptInput.count}-question multiple-choice quiz in the language: ${promptInput.language}. 
        
        ${theoryContextPrompt}
        
        Populate the "questions" array in the JSON object. Each question should have between 2 and 4 options, a single correct answer, and an explanation for the answer.

        For the "options" array:
        - Each option must be plain text **without any leading labels** such as "A)", "B.", "C -", or similar. Simply provide the option content itself.

        **Critically important**: The value for the "answer" field for each question object MUST be an exact, verbatim copy of one of the strings from the "options" array for that same question.

        The content for "question", "options", and "explanation" fields MUST be valid standard Markdown.
        - Use standard backticks (\`) for inline code blocks.
        - Use triple backticks with a language identifier for multi-line code blocks.
        - For mathematical notations, use standard LaTeX syntax: $...$ for inline math and $$...$$ for block-level math.
        
        The explanation for each question must end with the source of the information like this:
        (Nguồn: ${promptInput.source})

        ${existingQuestionsPrompt}
        `;
        
        const generationConfig: GenerationConfig = {
          responseMimeType: "application/json",
          // @ts-ignore - responseSchema is a valid property
          responseSchema: GenerateQuizJsonSchema,
        };

        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: promptText }] }],
          generationConfig,
          safetySettings: [
              { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          ]
        });

        const parsedJson = JSON.parse(result.response.text());
        const validatedOutput = GenerateQuizOutputContainerSchema.parse(parsedJson);

        const validQuestions = validatedOutput.questions.filter(question => {
          const isValid = question.options.includes(question.answer);
          if (!isValid) {
            console.warn('AI generated an invalid question (answer not in options), filtering it out:', question);
          }
          return isValid;
        });

        console.log(`✅ Generated ${validQuestions.length} valid quiz questions (filtered from ${validatedOutput.questions.length}).`);
        return validQuestions;
    }
  });
}
