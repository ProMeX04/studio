
import { withAuth, createSuccessResponse, createErrorResponse, type AuthenticatedRequest } from '@/lib/api-middleware';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { startGenerationSchema, validateRequest } from '@/lib/validation';
import { generateOutline } from '@/ai/flows/generate-outline-flow';
import { generateChapter } from '@/ai/flows/generate-chapter-flow';
import { generateFlashcards } from '@/ai/flows/generate-flashcards-flow';
import { generateQuiz } from '@/ai/flows/generate-quiz-flow';

async function handler(req: AuthenticatedRequest) {
  try {
    const body = await req.json();
    const { error, value } = validateRequest(startGenerationSchema, body);
    if (error) {
      return createErrorResponse(`Validation error: ${error}`, 400);
    }

    const { topic, language, knowledgeLevel, learningGoal, learningStyle, tone } = value!;
    const userId = req.user!.uid;

    const { adminDb } = getFirebaseAdmin();
    const jobId = `job_${Date.now()}_${userId.substring(0, 5)}`;
    
    // Create job document in Firestore
    await adminDb.collection('generationJobs').doc(jobId).set({
      userId,
      topic,
      language,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Start background generation without awaiting it
    processGenerationJob(jobId, {
      userId, topic, language, knowledgeLevel, learningGoal, learningStyle, tone
    });

    return createSuccessResponse({
      jobId,
      message: 'Generation job started successfully',
      status: 'pending',
    });

  } catch (err: any) {
    console.error('Start generation error:', err);
    return createErrorResponse(err.message || 'Internal server error', 500);
  }
}

// This function runs in the background
async function processGenerationJob(jobId: string, params: any) {
  const { adminDb } = getFirebaseAdmin();
  const jobRef = adminDb.collection('generationJobs').doc(jobId);

  try {
    const { userId, topic, language, knowledgeLevel, learningGoal, learningStyle, tone } = params;
    const personalization = { knowledgeLevel, learningGoal, learningStyle, tone };

    // 1. Generate Outline
    await jobRef.update({ status: 'generating_outline', updatedAt: new Date() });
    const outline = await generateOutline({ topic, language, ...personalization });

    // 2. Generate Theory Chapters
    await jobRef.update({ status: 'generating_theory', progress: 0, updatedAt: new Date() });
    const theoryChapters = [];
    for (let i = 0; i < outline.length; i++) {
      const chapterTitle = outline[i];
      const chapterContent = await generateChapter({ topic, chapterTitle, language, ...personalization });
      theoryChapters.push({
        id: `${jobId}-ch-${i + 1}`,
        title: chapterTitle,
        content: chapterContent,
        podcastScript: null,
        audioDataUri: null,
      });
      await jobRef.update({ progress: ((i + 1) / outline.length) * 100 });
    }
    const fullTheoryContent = theoryChapters.map(c => `Chapter: ${c.title}\n${c.content}`).join('\n\n---\n\n');

    const theorySet = { id: `theory-${jobId}`, topic, outline, chapters: theoryChapters };

    // 3. Generate Flashcards and Quiz in parallel
    await jobRef.update({ status: 'generating_flashcards', updatedAt: new Date() });
    const flashcardsPromise = generateFlashcards({ topic, language, theoryContent: fullTheoryContent });
    
    await jobRef.update({ status: 'generating_quiz', updatedAt: new Date() });
    const quizPromise = generateQuiz({ topic, language, theoryContent: fullTheoryContent });

    const [flashcards, quizQuestions] = await Promise.all([flashcardsPromise, quizPromise]);
    
    const flashcardSet = { id: `flashcards-${jobId}`, topic, cards: flashcards };
    const quizSet = { id: `quiz-${jobId}`, topic, questions: quizQuestions };

    // 4. Save all content to user's document
    await adminDb.collection('users').doc(userId).set({
      topic,
      language,
      theory: theorySet,
      flashcards: flashcardSet,
      quiz: quizSet,
      updatedAt: new Date(),
      generationJobId: null, // Clear the job ID
    }, { merge: true });

    // 5. Mark job as completed
    await jobRef.update({
      status: 'completed',
      completedAt: new Date(),
      result: {
        flashcardsCount: flashcards.length,
        quizCount: quizQuestions.length,
        theoryChapters: theoryChapters.length,
      }
    });

  } catch (error: any) {
    console.error(`❌ Generation job ${jobId} failed:`, error);
    await jobRef.update({
      status: 'failed',
      error: error.message || 'Unknown error during generation',
      updatedAt: new Date(),
    });
  }
}

export const POST = withAuth(handler);
