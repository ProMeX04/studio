import { config } from 'dotenv';
config();

import '@/ai/flows/generate-flashcards.ts';
import '@/ai/flows/answer-question.ts';
import '@/ai/flows/generate-quiz.ts';