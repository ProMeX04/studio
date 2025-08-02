import { NextRequest } from 'next/server';
import { withAuth, createSuccessResponse, createErrorResponse, type AuthenticatedRequest } from '@/lib/api-middleware';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

async function handler(req: AuthenticatedRequest) {
  if (req.method !== 'GET') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    const userId = req.user!.uid;
    const { adminDb } = getFirebaseAdmin();

    // Get user data
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();

    // Get generation jobs for user
    const jobsSnapshot = await adminDb.collection('generationJobs').where('userId', '==', userId).get();
    const jobs = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return createSuccessResponse({
      userId,
      userData: userData || null,
      jobs,
      totalJobs: jobs.length
    });

  } catch (error) {
    console.error('Debug data error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export const GET = withAuth(handler);
