/**
 * @fileOverview Shared Zod schemas and TypeScript types for AI flows.
 */

import {z} from 'genkit';

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
});
export type ExplainQuizOptionInput = z.infer<typeof ExplainQuizOptionInputSchema>;

export const ExplainQuizOptionOutputSchema = z.object({
    explanation: z.string().describe('The detailed explanation for the selected option.')
});
export type ExplainQuizOptionOutput = z.infer<typeof ExplainQuizOptionOutputSchema>;


// Live Tutor
export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  text: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const LiveTutorInputSchema = z.object({
  audioDataUri: z.string().describe("The user's speech as a WebM audio data URI."),
  context: z.string().describe("The context of the conversation (e.g., topic, current quiz question)."),
  history: z.array(ChatMessageSchema).describe("The history of the conversation so far."),
});
export type LiveTutorInput = z.infer<typeof LiveTutorInputSchema>;

export const LiveTutorOutputSchema = z.object({
    responseText: z.string().describe("The AI tutor's response text."),
    updatedHistory: z.array(ChatMessageSchema).describe("The updated conversation history."),
});
export type LiveTutorOutput = z.infer<typeof LiveTutorOutputSchema>;

// Text to Speech
export const TextToSpeechInputSchema = z.object({
    text: z.string().describe('The text to synthesize.'),
});
export type TextToSpeechInput = z.infer<typeof TextToSpeechInputSchema>;

export const TextToSpeechOutputSchema = z.object({
  audioDataUri: z.string().describe("The synthesized speech as a base64-encoded WAV data URI."),
});
export type TextToSpeechOutput = z.infer<typeof TextToSpeechOutputSchema>;
