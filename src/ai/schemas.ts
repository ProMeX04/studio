
/**
 * @fileOverview Shared Zod schemas and TypeScript types for AI flows.
 */

import {z} from 'zod';

// Helper to convert Zod schema to a basic JSON Schema representation
// for Google AI's responseSchema field.
export function zodToJsonSchema(schema: z.ZodType<any, any, any>): object {
    if (schema instanceof z.ZodObject) {
      const properties: { [key: string]: object } = {};
      const required: string[] = [];
      const shape = schema.shape;
      for (const key in shape) {
        if (Object.prototype.hasOwnProperty.call(shape, key)) {
          properties[key] = zodToJsonSchema(shape[key] as z.ZodType<any, any, any>);
          if (!shape[key].isOptional()) {
            required.push(key);
          }
        }
      }
      return {
        type: 'object',
        properties,
        ...(required.length > 0 && { required }),
      };
    } else if (schema instanceof z.ZodArray) {
      return {
        type: 'array',
        items: zodToJsonSchema(schema.element),
      };
    } else if (schema instanceof z.ZodString) {
      return { type: 'string', ...(schema.description && { description: schema.description }) };
    } else if (schema instanceof z.ZodNumber) {
      return { type: 'number', ...(schema.description && { description: schema.description }) };
    } else if (schema instanceof z.ZodBoolean) {
        return { type: 'boolean', ...(schema.description && { description: schema.description }) };
    }
    // Fallback for other types
    return {};
}


// Flashcards
export const FlashcardSchema = z.object({
    front: z.string().describe('The front side of the flashcard.'),
    back: z.string().describe('The back side of the flashcard.'),
});
export type Flashcard = z.infer<typeof FlashcardSchema>;

export const GenerateFlashcardsInputSchema = z.object({
  topic: z.string().describe('The topic for which to generate flashcards.'),
  count: z.number().describe('The number of flashcards to generate.'),
  language: z.string().describe('The language for the flashcards.'),
  existingCards: z.array(FlashcardSchema).optional().describe('An array of existing flashcards to avoid duplication.'),
});
export type GenerateFlashcardsInput = z.infer<typeof GenerateFlashcardsInputSchema>;

export const GenerateFlashcardsOutputSchema = z.array(FlashcardSchema);
export type GenerateFlashcardsOutput = z.infer<typeof GenerateFlashcardsOutputSchema>;

export const GenerateFlashcardsOutputContainerSchema = z.object({
    cards: GenerateFlashcardsOutputSchema.describe("An array of generated flashcards."),
});


export interface FlashcardSet {
  id: string;
  topic: string;
  cards: Flashcard[];
}


// Quiz
export const QuizQuestionSchema = z.object({
    question: z.string().describe('The question text.'),
    options: z.array(z.string()).describe('A list of possible answers.'),
    answer: z.string().describe('The correct answer.'),
    explanation: z.string().describe('A brief explanation for the correct answer.'),
});
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

export const GenerateQuizInputSchema = z.object({
  topic: z.string().describe('The topic for which to generate a quiz.'),
  count: z.number().describe('The number of questions to generate.'),
  language: z.string().describe('The language for the quiz.'),
  existingQuestions: z.array(QuizQuestionSchema).optional().describe('An array of existing questions to avoid duplication.'),
});
export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

export const GenerateQuizOutputSchema = z.array(QuizQuestionSchema);
export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;

export const GenerateQuizOutputContainerSchema = z.object({
    questions: GenerateQuizOutputSchema.describe("An array of generated quiz questions."),
});

export interface QuizSet {
  id: string;
  topic: string;
  questions: QuizQuestion[];
}


// Explain Quiz Option
export const ExplainQuizOptionInputSchema = z.object({
  topic: z.string().describe('The general topic of the quiz.'),
  question: z.string().describe('The quiz question.'),
  selectedOption: z.string().describe('The answer option the user wants an explanation for.'),
  correctAnswer: z.string().describe('The correct answer to the question.'),
  language: z.string().describe('The language for the explanation.'),
});
export type ExplainQuizOptionInput = z.infer<typeof ExplainQuizOptionInputSchema>;

export const ExplainQuizOptionOutputSchema = z.object({
    explanation: z.string().describe('The detailed explanation for the selected option.'),
});
export type ExplainQuizOptionOutput = z.infer<typeof ExplainQuizOptionOutputSchema>;
