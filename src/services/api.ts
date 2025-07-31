
/**
 * @fileOverview Service layer for fetching AI-generated content from the backend.
 * Each function corresponds to a specific content generation task.
 */

import {
  StartGenerationJobInputSchema,
  StartGenerationJobOutputSchema,
  ExplainQuizOptionInput,
  ExplainQuizOptionOutputSchema,
  GeneratePodcastScriptInput,
  GeneratePodcastScriptOutputSchema,
  GenerateAudioInput,
  GenerateAudioOutputSchema,
} from "@/ai/schemas"

const API_BASE_URL = "/api" // Replace with your actual backend URL if different

/**
 * A generic fetch handler for API requests.
 * @param endpoint The API endpoint to call.
 * @param body The request body.
 * @param schema The Zod schema to validate the response.
 * @returns The validated data from the API.
 * @throws An error if the request fails or the response is invalid.
 */
async function post<T>(endpoint: string, body: unknown, schema: Zod.Schema<T>): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
  }

  const json = await response.json();
  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    console.error("Invalid API response format:", parsed.error.issues);
    throw new Error("Invalid API response format.");
  }

  return parsed.data;
}


// --- API Functions ---

export const startGenerationJob = (body: StartGenerationJobInputSchema) =>
  post("/start-generation-job", body, StartGenerationJobOutputSchema);

export const explainQuizOption = (body: ExplainQuizOptionInput) =>
  post("/explain-quiz-option", body, ExplainQuizOptionOutputSchema);
  
export const generatePodcastScript = (body: GeneratePodcastScriptInput) =>
  post("/generate-podcast-script", body, GeneratePodcastScriptOutputSchema);

export const generateAudio = (body: GenerateAudioInput) =>
  post("/generate-audio", body, GenerateAudioOutputSchema);
