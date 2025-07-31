
import type { ExplainQuizOptionOutput } from "@/ai/schemas";
import type { ComponentType } from "react";

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
  understoodIndices: number[];
}

// --- Toolbar Configuration Types ---

// Defines the shape of a configuration object for a single item in the toolbar.
export interface ToolbarItemConfig {
  id: string; // Unique identifier for the item
  component: string; // Key to look up the component in the registry
  props: any; // Props to be passed to the rendered component
}
