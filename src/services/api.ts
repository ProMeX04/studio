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
    
    // All API responses are wrapped with { success, data, timestamp }
    const wrappedResponse = z.object({
      success: z.boolean(),
      data: schema,
      timestamp: z.string(),
    }).safeParse(response.data);

    if (!wrappedResponse.success) {
      console.error("Invalid API response format:", wrappedResponse.error.issues);
      throw new Error("Invalid API response format from server.");
    }
    
    return wrappedResponse.data.data as T;
  } catch (error: any) {
    // Axios wraps errors in an `error.response` object
    const errorMessage = error.response?.data?.error || error.message || "An unknown network error occurred.";
    console.error(`API request to ${endpoint} failed:`, errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * A generic GET request handler using the configured axios instance.
 */
async function get<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
  try {
    const response = await axios.get(endpoint, { params });
    // Assuming the structure is { success, data }
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || error.message || "An unknown network error occurred.";
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

// --- New Backend APIs ---

export const getJobStatus = (jobId: string, options?: { includeContent?: boolean }) => {
  const params: Record<string, any> = { jobId };
  if (options?.includeContent) {
    params.includeContent = 'true';
  }
  return get(`/job-status`, params);
};

// Data sync APIs
const SyncResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  conflict: z.boolean().optional(),
  serverData: z.any().optional(),
  serverLastModified: z.number().optional(),
  message: z.string().optional(),
});


export const syncUserData = (data: any, lastModified: number) =>
  post("/sync", { data, lastModified });

export const getUserData = () =>
  get("/sync");

export const batchSyncData = (batchData: Record<string, any>) =>
  axios.put("/sync", { batchData });

// User profile APIs
const UserProfileSchema = z.object({
  uid: z.string(),
  email: z.string().optional(),
  displayName: z.string().optional(),
  photoURL: z.string().optional(),
  preferences: z.any().optional(),
  stats: z.object({
    topicsCompleted: z.number(),
    totalStudyTime: z.number(),
    streak: z.number(),
  }).optional(),
});

export const getUserProfile = () =>
  get("/user/profile");

export const updateUserProfile = (profile: any) =>
  post("/user/profile", profile);

// Clear User Data
export const clearUserData = () => axios.delete('/clear-data');

// Get Debug Data
export const getDebugData = () => get('/debug-data');
