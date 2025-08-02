import { NextRequest } from 'next/server';
import { withAuth, createSuccessResponse, createErrorResponse, type AuthenticatedRequest } from '@/lib/api-middleware';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

async function handleGET(req: AuthenticatedRequest) {
  try {
    const userId = req.user!.uid;
    const { adminDb } = getFirebaseAdmin();

    // Get user's data from Firestore
    const userDoc = await adminDb.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return createSuccessResponse({ data: {} });
    }

    const userData = userDoc.data();
    const { createdAt, updatedAt, ...cleanData } = userData || {};

    return createSuccessResponse({
      data: cleanData,
      lastModified: updatedAt?.toMillis() || 0,
    });

  } catch (error) {
    console.error('Sync GET error:', error);
    return createErrorResponse('Failed to fetch user data', 500);
  }
}

async function handlePOST(req: AuthenticatedRequest) {
  try {
    const userId = req.user!.uid;
    const body = await req.json();
    const { data, lastModified } = body;

    if (!data || typeof lastModified !== 'number') {
      return createErrorResponse('Invalid sync data format', 400);
    }

    const { adminDb } = getFirebaseAdmin();

    // Get current user document
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const currentData = userDoc.data();
    const currentModified = currentData?.updatedAt?.toMillis() || 0;

    // Check for conflicts (server data is newer)
    if (currentModified > lastModified) {
      return createSuccessResponse({
        conflict: true,
        serverData: currentData,
        serverLastModified: currentModified,
        message: 'Server data is newer, resolve conflict',
      });
    }

    // Update user data
    await adminDb.collection('users').doc(userId).set({
      ...data,
      updatedAt: new Date(),
      syncedAt: new Date(),
    }, { merge: true });

    return createSuccessResponse({
      success: true,
      message: 'Data synced successfully',
      syncedAt: Date.now(),
    });

  } catch (error) {
    console.error('Sync POST error:', error);
    return createErrorResponse('Failed to sync data', 500);
  }
}

async function handlePUT(req: AuthenticatedRequest) {
  try {
    const userId = req.user!.uid;
    const body = await req.json();
    const { batchData } = body;

    if (!batchData || typeof batchData !== 'object') {
      return createErrorResponse('Invalid batch data format', 400);
    }

    const { adminDb } = getFirebaseAdmin();

    // Batch update
    const batch = adminDb.batch();
    const userDocRef = adminDb.collection('users').doc(userId);

    // Update each data key
    const updateData: any = {
      updatedAt: new Date(),
      syncedAt: new Date(),
    };

    for (const [key, value] of Object.entries(batchData)) {
      if (value && typeof value === 'object' && 'data' in value) {
        updateData[key] = (value as any).data;
      }
    }

    batch.set(userDocRef, updateData, { merge: true });
    await batch.commit();

    return createSuccessResponse({
      success: true,
      message: 'Batch sync completed',
      itemsUpdated: Object.keys(batchData).length,
      syncedAt: Date.now(),
    });

  } catch (error) {
    console.error('Batch sync error:', error);
    return createErrorResponse('Failed to batch sync data', 500);
  }
}

// Route handlers
export async function GET(req: NextRequest) {
  return withAuth(handleGET)(req);
}

export async function POST(req: NextRequest) {
  return withAuth(handlePOST)(req);
}

export async function PUT(req: NextRequest) {
  return withAuth(handlePUT)(req);
}
