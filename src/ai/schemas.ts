
/**
 * @fileOverview Shared Zod schemas and TypeScript types for AI flows.
 */

import {z} from 'zod';
import { Schema, Part, FunctionDeclaration, GenerationConfig } from '@google/generative-ai';

// --- Manually Defined JSON Schemas for Google AI ---

export const GenerateFlashcardsJsonSchema: Schema = {
  type: "OBJECT",
  properties: {
    cards: {
      type: "ARRAY",
      description: "An array of generated flashcards.",
      items: {
        type: "OBJECT",
        properties: {
          front: {
            type: "STRING",
            description: "The front side of the flashcard (a question or term)."
          },
          back: {
            type: "STRING",
            description: "The back side of the flashcard (the answer or definition)."
          }
        },
        required: ["front", "back"]
      }
    }
  },
  required: ["cards"]
};

export const GenerateQuizJsonSchema: Schema = {
    type: "OBJECT",
    properties: {
        questions: {
            type: "ARRAY",
            description: "An array of generated quiz questions.",
            items: {
                type: "OBJECT",
                properties: {
                    question: {
                        type: "STRING",
                        description: "The question text."
                    },
                    options: {
                        type: "ARRAY",
                        description: "A list of 4 possible answers.",
                        items: {
                            type: "STRING"
                        }
                    },
                    answer: {
                        type: "STRING",
                        description: "The correct answer. Must be one of the strings from the 'options' array."
                    },
                    explanation: {
                        type: "STRING",
                        description: "A brief explanation for the correct answer."
                    }
                },
                required: ["question", "options", "answer", "explanation"]
            }
        }
    },
    required: ["questions"]
};

export const ExplainQuizOptionJsonSchema: Schema = {
    type: "OBJECT",
    properties: {
        explanation: {
            type: "STRING",
            description: "The detailed explanation for the selected option."
        }
    },
    required: ["explanation"]
};


// --- Zod Schemas for Client-Side Validation and Type Inference ---

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
