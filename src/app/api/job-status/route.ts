import { NextRequest } from 'next/server';
import { withAuth, createSuccessResponse, createErrorResponse, type AuthenticatedRequest } from '@/lib/api-middleware';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

async function handler(req: AuthenticatedRequest) {
  if (req.method !== 'GET') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return createErrorResponse('Job ID is required', 400);
    }

    const userId = req.user!.uid;
    const { adminDb } = getFirebaseAdmin();

    // Get job status from database
    const jobDoc = await adminDb.collection('generationJobs').doc(jobId).get();
    
    if (!jobDoc.exists) {
      return createErrorResponse('Job not found', 404);
    }

    const jobData = jobDoc.data();
    
    // Verify job belongs to user
    if (jobData?.userId !== userId) {
      return createErrorResponse('Job not found', 404);
    }

    // Return job status
    return createSuccessResponse({
      jobId,
      status: jobData.status,
      createdAt: jobData.createdAt,
      updatedAt: jobData.updatedAt,
      completedAt: jobData.completedAt,
      result: jobData.result,
      error: jobData.error,
      progress: getJobProgress(jobData.status),
    });

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

export { handler as GET };
