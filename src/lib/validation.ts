import Joi from 'joi';

// Base schemas
export const idSchema = Joi.string().required().min(1);
export const emailSchema = Joi.string().email().required();
export const urlSchema = Joi.string().uri().optional();

// User data schemas
export const userDataSchema = Joi.object({
  topic: Joi.string().optional(),
  language: Joi.string().optional(),
  model: Joi.string().optional(),
  flashcards: Joi.array().optional(),
  quiz: Joi.array().optional(),
  theory: Joi.array().optional(),
  settings: Joi.object().optional(),
});

// Generation request schemas
export const startGenerationSchema = Joi.object({
  topic: Joi.string().required().min(1).max(200),
  language: Joi.string().required().valid('Vietnamese', 'English', 'Spanish', 'French', 'German', 'Japanese', 'Korean', 'Chinese'),
  model: Joi.string().required().valid('gemini-1.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'),
  forceNew: Joi.boolean().default(false),
  personalization: Joi.object({
    knowledgeLevel: Joi.string().valid('beginner', 'intermediate', 'advanced').default('beginner'),
    learningGoal: Joi.string().valid('overview', 'deep_dive', 'practical').default('overview'),
    learningStyle: Joi.string().valid('reading', 'visual', 'auditory', 'kinesthetic').default('reading'),
    tone: Joi.string().valid('formal', 'casual').default('casual'),
  }).optional(),
});

export const explainQuizSchema = Joi.object({
  questionId: Joi.string().required(),
  selectedOption: Joi.string().required(),
  questionText: Joi.string().required(),
  options: Joi.array().items(Joi.string()).required(),
  correctAnswer: Joi.string().required(),
});

export const generatePodcastSchema = Joi.object({
  topic: Joi.string().required().min(1),
  language: Joi.string().required(),
  duration: Joi.string().valid('short', 'medium', 'long').default('medium'),
  tone: Joi.string().valid('formal', 'casual', 'conversational').default('conversational'),
});

export const generateAudioSchema = Joi.object({
  text: Joi.string().required().min(1).max(5000),
  voice: Joi.string().optional(),
  speed: Joi.number().min(0.5).max(2.0).default(1.0),
  language: Joi.string().default('vi-VN'),
});

// Search schemas
export const searchPublicTopicsSchema = Joi.object({
  query: Joi.string().required().min(1).max(100),
  limit: Joi.number().min(1).max(50).default(10),
  offset: Joi.number().min(0).default(0),
});

export const clonePublicTopicSchema = Joi.object({
  publicTopicId: Joi.string().required(),
});

// Sync schemas
export const syncDataSchema = Joi.object({
  data: Joi.object().required(),
  lastModified: Joi.number().required(),
  dataType: Joi.string().required().valid(
    'flashcards', 'flashcardState', 'quiz', 'quizState', 
    'theory', 'theoryState', 'topic', 'language', 'model',
    'view', 'visibility', 'background', 'uploadedBackgrounds',
    'flashcardIndex', 'theoryChapterIndex', 'hasCompletedOnboarding',
    'generationJobId'
  ),
});

export const batchSyncSchema = Joi.object({
  data: Joi.object().pattern(
    Joi.string(),
    Joi.object({
      data: Joi.any().required(),
      lastModified: Joi.number().required(),
    })
  ).required(),
});

// Validation helper function with offline error handling
export function validateRequest<T>(schema: Joi.ObjectSchema<T>, data: any): { error?: string; value?: T } {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return { error: errorMessage };
  }

  return { value };
}

// Firebase error handling schema
export const firebaseErrorSchema = Joi.object({
  code: Joi.string().valid(
    'unavailable', 'deadline-exceeded', 'unauthenticated', 
    'permission-denied', 'not-found', 'already-exists',
    'resource-exhausted', 'failed-precondition', 'aborted',
    'out-of-range', 'unimplemented', 'internal', 'data-loss'
  ).required(),
  message: Joi.string().required(),
  details: Joi.object().optional(),
});

// Offline handling helper
export function isOfflineError(error: any): boolean {
  return error?.code === 'unavailable' || 
         error?.message?.includes('offline') ||
         error?.message?.includes('client is offline') ||
         error?.message?.includes('network');
}

// Rate limiting schema
export const rateLimitSchema = Joi.object({
  windowMs: Joi.number().default(60000), // 1 minute
  maxRequests: Joi.number().default(100),
  keyGenerator: Joi.function().optional(),
});

// File upload schema
export const fileUploadSchema = Joi.object({
  file: Joi.object().required(),
  maxSize: Joi.number().default(5 * 1024 * 1024), // 5MB
  allowedTypes: Joi.array().items(Joi.string()).default(['image/jpeg', 'image/png', 'image/webp']),
});
