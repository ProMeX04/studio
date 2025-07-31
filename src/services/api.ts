/**
 * @fileOverview Service layer for fetching AI-generated content from the backend.
 * Each function corresponds to a specific content generation task.
 */

import axios from "@/lib/axios";
import {
  StartGenerationJobInput,
  StartGenerationJobOutputSchema,
  ExplainQuizOptionInput,
  ExplainQuizOptionOutputSchema,
  GeneratePodcastScriptInput,
  GeneratePodcastScriptOutputSchema,
  GenerateAudioInput,
  GenerateAudioOutputSchema,
  SearchPublicTopicsInput,
  SearchPublicTopicsOutputSchema,
  ClonePublicTopicInput,
  ClonePublicTopicOutputSchema,
} from "@/ai/schemas"
import { z } from "zod";


/**
 * A generic POST request handler using the configured axios instance.
 * @param endpoint The API endpoint to call (e.g., "/start-generation-job").
 * @param body The request body.
 * @param schema The Zod schema to validate the response data.
 * @returns The validated data from the API.
 * @throws An error if the request fails or the response is invalid.
 */
async function post<T>(endpoint: string, body: unknown, schema: z.Schema<T>): Promise<T> {
  try {
    const response = await axios.post(endpoint, body);
    const parsed = schema.safeParse(response.data);

    if (!parsed.success) {
      console.error("Invalid API response format:", parsed.error.issues);
      throw new Error("Invalid API response format from server.");
    }
    
    return parsed.data;
  } catch (error: any) {
    // Axios wraps errors in an `error.response` object
    const errorMessage = error.response?.data?.message || error.message || "An unknown network error occurred.";
    console.error(`API request to ${endpoint} failed:`, errorMessage);
    throw new Error(errorMessage);
  }
}


// --- API Functions ---

export const startGenerationJob = (body: StartGenerationJobInput) =>
  post("/start-generation-job", body, StartGenerationJobOutputSchema);

export const explainQuizOption = (body: ExplainQuizOptionInput) =>
  post("/explain-quiz-option", body, ExplainQuizOptionOutputSchema);
  
export const generatePodcastScript = (body: GeneratePodcastScriptInput) =>
  post("/generate-podcast-script", body, GeneratePodcastScriptOutputSchema);

export const generateAudio = (body: GenerateAudioInput) =>
  post("/generate-audio", body, GenerateAudioOutputSchema);
  
export const searchPublicTopics = (body: SearchPublicTopicsInput) =>
  post("/search-public-topics", body, SearchPublicTopicsOutputSchema);

export const clonePublicTopic = (body: ClonePublicTopicInput) =>
  post("/clone-public-topic", body, ClonePublicTopicOutputSchema);
