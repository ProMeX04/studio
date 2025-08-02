
import { NextRequest } from 'next/server';
import { withAuth, createSuccessResponse, createErrorResponse, type AuthenticatedRequest } from '@/lib/api-middleware';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

async function handler(req: AuthenticatedRequest) {
  if (req.method !== 'GET') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    const { searchParams } = req.nextUrl;
    const jobId = searchParams.get('jobId');
    const includeContent = searchParams.get('includeContent') === 'true';

    console.log('🔍 Job Status Request:', { jobId, includeContent, url: req.url });

    if (!jobId) {
      return createErrorResponse('Job ID is required', 400);
    }

    const userId = req.user!.uid;
    const { adminDb } = await getFirebaseAdmin();

    // Get job status from database
    const jobDoc = await adminDb.collection('generationJobs').doc(jobId).get();
    
    if (!jobDoc.exists) {
      return createErrorResponse('Job not found', 404);
    }

    const jobData = jobDoc.data();
    
    console.log('📄 Job Data:', { 
      jobId, 
      status: jobData?.status, 
      userId: jobData?.userId,
      requestUserId: userId 
    });
    
    // Verify job belongs to user
    if (jobData?.userId !== userId) {
      return createErrorResponse('Job not found', 404);
    }

    // If job is completed and content is requested, get full content from users collection
    let fullContent = null;
    if (includeContent && jobData.status === 'completed') {
      console.log('🔄 Fetching full content from users collection...');
      const userDoc = await adminDb.collection('users').doc(userId).get();
      const userData = userDoc.data();
      
      console.log('👤 User Data:', { 
        exists: userDoc.exists,
        hasFlashcards: !!(userData?.flashcards),
        hasQuiz: !!(userData?.quiz), 
        hasTheory: !!(userData?.theory),
        flashcardsCount: userData?.flashcards?.length || 0,
        quizCount: userData?.quiz?.length || 0,
        theoryCount: userData?.theory?.length || 0
      });
      
      if (userData) {
        fullContent = {
          flashcards: userData.flashcards || [],
          quiz: userData.quiz || [],
          theory: userData.theory || [],
        };
        console.log('✅ Full content prepared:', {
          flashcardsCount: fullContent.flashcards.length,
          quizCount: fullContent.quiz.length,
          theoryCount: fullContent.theory.length
        });
      }
    }

    // Return job status with optional full content
    const response: any = {
      jobId,
      status: jobData.status,
      createdAt: jobData.createdAt,
      updatedAt: jobData.updatedAt,
      completedAt: jobData.completedAt,
      error: jobData.error,
      progress: getJobProgress(jobData.status),
    };

    if (fullContent) {
      // Return full content
      console.log('📦 Returning full content');
      response.result = fullContent;
    } else {
      // Return counts only
      console.log('📊 Returning counts only');
      response.result = jobData.result;
    }

    return createSuccessResponse(response);

  } catch (error) {
    console.error('Job status error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

function getJobProgress(status: string): { percentage: number; message: string } {
  switch (status) {
    case 'pending':
      return { percentage: 10, message: 'Đang khởi tạo...' };
    case 'processing':
      return { percentage: 50, message: 'Đang tạo nội dung...' };
    case 'completed':
      return { percentage: 100, message: 'Hoàn thành!' };
    case 'failed':
      return { percentage: 0, message: 'Có lỗi xảy ra' };
    default:
      return { percentage: 0, message: 'Không xác định' };
  }
}

export const GET = withAuth(handler);
