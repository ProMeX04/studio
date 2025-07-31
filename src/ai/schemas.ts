

/**
 * @fileOverview Shared Zod schemas and TypeScript types for AI-generated content.
 * These schemas are used to validate data received from the backend.
 */

import {z} from 'zod';

// --- Zod Schemas for Client-Side Validation and Type Inference ---

// Generic Card / Typing
export const CardSchema = z.object({
    front: z.string().describe('The front side of the card (term/question/title).'),
    back: z.string().describe('The back side of the card (definition/answer/content).'),
    source: z.string().optional().describe('The source chapter for this card.'),
});
export type CardData = z.infer<typeof CardSchema>;

export const GenerateCardsInputSchema = z.object({
  topic: z.string().describe('The topic for which to generate content.'),
  count: z.number().describe('The number of items to generate.'),
  language: z.string().describe('The language for the content.'),
  existingCards: z.array(CardSchema).optional().describe('An array of existing items to avoid duplication.'),
  theoryContent: z.string().optional().describe('The theory content to base the generation on.'),
  source: z.string().optional().describe('The source for the content.'),
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
    source: z.string().optional().describe('The source chapter for this question.'),
});
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

export const GenerateQuizInputSchema = z.object({
  topic: z.string().describe('The topic for which to generate a quiz.'),
  count: z.number().describe('The number of questions to generate.'),
  language: z.string().describe('The language for the quiz.'),
  existingQuestions: z.array(QuizQuestionSchema).optional().describe('An array of existing questions to avoid duplication.'),
  theoryContent: z.string().optional().describe('The theory content to base the generation on.'),
  source: z.string().optional().describe('The source for the content.'),
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
export const GenerateTheoryOutlineInputSchema = z.object({
  topic: z.string().describe('The topic for which to generate a theory document outline.'),
  language: z.string().describe('The language for the theory document.'),
});
export type GenerateTheoryOutlineInput = z.infer<typeof GenerateTheoryOutlineInputSchema>;

export const GenerateTheoryOutlineOutputSchema = z.object({
  outline: z.array(z.string()).describe('A structured outline of topics to cover.'),
});
export type GenerateTheoryOutlineOutput = z.infer<typeof GenerateTheoryOutlineOutputSchema>;

export const GenerateTheoryChapterInputSchema = z.object({
  topic: z.string().describe('The overall topic of the document.'),
  chapterTitle: z.string().describe('The title of the specific chapter to generate content for.'),
  language: z.string().describe('The language for the chapter content.'),
});
export type GenerateTheoryChapterInput = z.infer<typeof GenerateTheoryChapterInputSchema>;

export const GenerateTheoryChapterOutputSchema = z.object({
  content: z.string().describe('The detailed content for the chapter in Markdown format.'),
});
export type GenerateTheoryChapterOutput = z.infer<typeof GenerateTheoryChapterOutputSchema>;


// Podcast
export const GeneratePodcastScriptInputSchema = z.object({
    topic: z.string().describe('The overall topic of the document.'),
    chapterTitle: z.string().describe('The title of the chapter for the script.'),
    theoryContent: z.string().describe('The theory content to convert to a script.'),
    language: z.string().describe('The language for the script.'),
});
export type GeneratePodcastScriptInput = z.infer<typeof GeneratePodcastScriptInputSchema>;

export const GeneratePodcastScriptOutputSchema = z.object({
    script: z.string().describe('The generated podcast script.'),
});
export type GeneratePodcastScriptOutput = z.infer<typeof GeneratePodcastScriptOutputSchema>;

export const GenerateAudioInputSchema = z.object({
    script: z.string().describe('The script to convert to audio.'),
});
export type GenerateAudioInput = z.infer<typeof GenerateAudioInputSchema>;

export const GenerateAudioOutputSchema = z.object({
    audioDataUri: z.string().describe('The generated audio as a base64 data URI.'),
});
export type GenerateAudioOutput = z.infer<typeof GenerateAudioOutputSchema>;


export interface TheoryChapter {
  title: string;
  content: string | null; // Null while generating
  podcastScript: string | null;
  audioDataUri: string | null;
}
export interface TheorySet {
  id: string;
  topic: string;
  outline: string[];
  chapters: TheoryChapter[];
}

// Live Dialog
export const LiveDialogResponsePartSchema = z.object({
  text: z.string().optional(),
  audio: z.string().optional().describe("Base64 encoded audio data"),
});
export type LiveDialogResponsePart = z.infer<typeof LiveDialogResponsePartSchema>;

export const LiveDialogResponseSchema = z.object({
  parts: z.array(LiveDialogResponsePartSchema),
});
export type LiveDialogResponse = z.infer<typeof LiveDialogResponseSchema>;

export type DialogTurn = {
  id: number;
  speaker: 'user' | 'model';
  text: string;
  audioDataUri?: string;
  isProcessing?: boolean;
};
