import { NextRequest } from 'next/server';
import { withAuth, createSuccessResponse, createErrorResponse, type AuthenticatedRequest } from '@/lib/api-middleware';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

async function handler(req: AuthenticatedRequest) {
  if (req.method !== 'DELETE') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    const userId = req.user!.uid;
    const { adminDb } = getFirebaseAdmin();

    console.log(`🗑️ Clearing all data for user: ${userId}`);

    // Delete user document
    await adminDb.collection('users').doc(userId).delete();
    console.log('✅ User document deleted');

    // Delete generation jobs for user
    const jobsSnapshot = await adminDb.collection('generationJobs').where('userId', '==', userId).get();
    
    const batch = adminDb.batch();
    jobsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    if (!jobsSnapshot.empty) {
      await batch.commit();
      console.log(`✅ Deleted ${jobsSnapshot.docs.length} generation jobs`);
    }

    return createSuccessResponse({
      message: 'All user data cleared successfully',
      deletedJobs: jobsSnapshot.docs.length
    });

  } catch (error) {
    console.error('Clear data error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export const DELETE = withAuth(handler);
