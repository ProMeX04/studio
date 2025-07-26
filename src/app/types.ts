
import type { ExplainQuizOptionOutput } from "@/ai/schemas";

/**
 * @fileOverview UI-specific types and interfaces.
 * This file contains types that are used for managing the state and props
 * of UI components, separating them from the AI data schemas.
 */

export interface AnswerState {
  [questionIndex: number]: {
      selected: string | null;
      isAnswered: boolean;
      explanations?: { [option: string]: ExplainQuizOptionOutput };
  }
}

export interface QuizState {
  currentQuestionIndex: number;
  answers: AnswerState;
}

export interface FlashcardState {
  understoodIndices: number[];
}

export interface TheoryState {
  // Used to track which accordion items are open
  openChapters: string[];
}
