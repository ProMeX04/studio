import { NextRequest } from 'next/server';
import { withAuth, createSuccessResponse, createErrorResponse, type AuthenticatedRequest } from '@/lib/api-middleware';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { startGenerationSchema, validateRequest } from '@/lib/validation';

async function handler(req: AuthenticatedRequest) {
  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    // Parse request body
    const body = await req.json();
    
    // Validate request
    const { error, value } = validateRequest(startGenerationSchema, body);
    if (error) {
      return createErrorResponse(`Validation error: ${error}`, 400);
    }

    const { topic, language, model, forceNew, personalization } = value!;
    const userId = req.user!.uid;

    // Get Firestore instance
    const { adminDb } = getFirebaseAdmin();

    // Check if user already has content for this topic (unless forceNew)
    if (!forceNew) {
      const userDoc = await adminDb.collection('users').doc(userId).get();
      const userData = userDoc.data();
      
      if (userData?.topic === topic && userData?.flashcards) {
        return createSuccessResponse({
          message: 'Existing content found',
          jobId: userData.generationJobId || 'existing',
          status: 'completed'
        });
      }
    }

    // Generate unique job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Save generation job to database
    await adminDb.collection('generationJobs').doc(jobId).set({
      userId,
      topic,
      language,
      model,
      personalization: personalization || {},
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Update user's current generation job
    await adminDb.collection('users').doc(userId).set({
      generationJobId: jobId,
      topic,
      language,
      model,
      updatedAt: new Date(),
    }, { merge: true });

    // Start background generation process
    // In production, this would trigger a background job/queue
    // For now, we'll simulate async processing
    processGenerationJob(jobId, {
      userId,
      topic,
      language,
      model,
      personalization: personalization || {}
    });

    return createSuccessResponse({
      jobId,
      message: 'Generation job started',
      status: 'pending',
      estimatedTime: '2-5 minutes'
    });

  } catch (error) {
    console.error('Start generation error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

// Background job processor (simulated)
async function processGenerationJob(jobId: string, params: any) {
  try {
    const { adminDb } = getFirebaseAdmin();
    
    // Update job status to processing
    await adminDb.collection('generationJobs').doc(jobId).update({
      status: 'processing',
      updatedAt: new Date(),
    });

    // Simulate content generation (replace with actual AI generation)
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Generate sample content (replace with actual generation logic)
    const generatedContent = await generateSampleContent(params);

    // Save generated content to user's document
    await adminDb.collection('users').doc(params.userId).set({
      flashcards: generatedContent.flashcards,
      quiz: generatedContent.quiz,
      theory: generatedContent.theory,
      generatedAt: new Date(),
    }, { merge: true });

    // Update job status to completed
    await adminDb.collection('generationJobs').doc(jobId).update({
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date(),
      result: {
        flashcardsCount: generatedContent.flashcards.length,
        quizCount: generatedContent.quiz.length,
        theoryChapters: generatedContent.theory.length,
      }
    });

    console.log(`✅ Generation job ${jobId} completed successfully`);

  } catch (error) {
    console.error(`❌ Generation job ${jobId} failed:`, error);
    
    // Update job status to failed
    const { adminDb } = getFirebaseAdmin();
    await adminDb.collection('generationJobs').doc(jobId).update({
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      updatedAt: new Date(),
    });
  }
}

// Sample content generator (replace with actual AI integration)
async function generateSampleContent(params: any) {
  const { topic, language, personalization } = params;
  
  return {
    flashcards: [
      {
        id: '1',
        question: `What is ${topic}?`,
        answer: `${topic} is an important concept in its field.`,
        difficulty: personalization.knowledgeLevel || 'beginner',
      },
      // Add more flashcards...
    ],
    quiz: [
      {
        id: '1',
        question: `Which of the following best describes ${topic}?`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 'Option A',
        explanation: 'This is the correct answer because...',
      },
      // Add more quiz questions...
    ],
    theory: [
      {
        id: '1',
        title: `Introduction to ${topic}`,
        content: `This chapter introduces the basic concepts of ${topic}...`,
        order: 1,
      },
      // Add more theory chapters...
    ],
  };
}

export { handler as POST };
