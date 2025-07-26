
/**
 * @fileOverview Shared Zod schemas and TypeScript types for AI flows.
 */

import {z} from 'zod';
import { Schema, Part, FunctionDeclaration, GenerationConfig } from '@google/generative-ai';

// --- Manually Defined JSON Schemas for Google AI ---

export const GenerateCardsJsonSchema: Schema = {
  type: "OBJECT",
  properties: {
    cards: {
      type: "ARRAY",
      description: "An array of generated cards or items.",
      items: {
        type: "OBJECT",
        properties: {
          front: {
            type: "STRING",
            description: "The front side of the card (a question, term, or title)."
          },
          back: {
            type: "STRING",
            description: "The back side of the card (the answer, definition, or content)."
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
                        description: "A list of 2 to 4 possible answers.",
                        minItems: 2,
                        maxItems: 4,
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

export const GenerateTheoryJsonSchema: Schema = {
  type: "OBJECT",
  properties: {
    theory: {
      type: "STRING",
      description: "A comprehensive, well-structured theoretical document in Markdown format."
    }
  },
  required: ["theory"]
};


// --- Zod Schemas for Client-Side Validation and Type Inference ---

// Generic Card / Typing
export const CardSchema = z.object({
    front: z.string().describe('The front side of the card (term/question/title).'),
    back: z.string().describe('The back side of the card (definition/answer/content).'),
});
export type CardData = z.infer<typeof CardSchema>;

export const GenerateCardsInputSchema = z.object({
  topic: z.string().describe('The topic for which to generate content.'),
  count: z.number().describe('The number of items to generate.'),
  language: z.string().describe('The language for the content.'),
  existingCards: z.array(CardSchema).optional().describe('An array of existing items to avoid duplication.'),
});
export type GenerateCardsInput = z.infer<typeof GenerateCardsInputSchema>;

export const GenerateCardsOutputSchema = z.array(CardSchema);
export type GenerateCardsOutput = z.infer<typeof GenerateCardsOutputSchema>;

export const GenerateCardsOutputContainerSchema = z.object({
    cards: GenerateCardsOutputSchema.describe("An array of generated cards."),
});


export interface CardSet {
  id: string;
  topic: string;
  cards: CardData[];
}


// Quiz
export const QuizQuestionSchema = z.object({
    question: z.string().describe('The question text.'),
    options: z.array(z.string()).min(2).max(4).describe('A list of 2 to 4 possible answers.'),
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


// Theory
export const GenerateTheoryInputSchema = z.object({
  topic: z.string().describe('The topic for which to generate a theory document.'),
  language: z.string().describe('The language for the theory document.'),
});
export type GenerateTheoryInput = z.infer<typeof GenerateTheoryInputSchema>;

export const GenerateTheoryOutputSchema = z.object({
  theory: z.string().describe('A comprehensive, well-structured theoretical document in Markdown format.'),
});
export type GenerateTheoryOutput = z.infer<typeof GenerateTheoryOutputSchema>;

export const GenerateTheoryOutputContainerSchema = z.object({
  theory: z.string().describe("A comprehensive, well-structured theoretical document in Markdown format."),
});

export interface TheorySet {
  id: string;
  topic: string;
  content: string;
}
