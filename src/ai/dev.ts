import { config } from 'dotenv';
config();

import '@/ai/flows/generate-flashcards.ts';
import '@/ai/flows/generate-quiz.ts';
import '@/ai/flows/explain-quiz-option.ts';
