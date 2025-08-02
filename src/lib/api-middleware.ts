import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-admin';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    uid: string;
    email?: string;
    name?: string;
    picture?: string;
  };
}

// Middleware to verify Firebase ID token
export function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Missing or invalid authorization header' },
          { status: 401 }
        );
      }

      const idToken = authHeader.split('Bearer ')[1];
      if (!idToken) {
        return NextResponse.json(
          { error: 'Missing ID token' },
          { status: 401 }
        );
      }

      // Verify the token
      const decodedToken = await verifyIdToken(idToken);
      
      // Add user info to request
      (req as AuthenticatedRequest).user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name,
        picture: decodedToken.picture,
      };

      // Call the actual handler
      return await handler(req as AuthenticatedRequest);

    } catch (error) {
      console.error('Authentication failed:', error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
  };
}

// Middleware for optional authentication (user can be guest)
export function withOptionalAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const authHeader = req.headers.get('authorization');
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const idToken = authHeader.split('Bearer ')[1];
        
        if (idToken) {
          try {
            const decodedToken = await verifyIdToken(idToken);
            (req as AuthenticatedRequest).user = {
              uid: decodedToken.uid,
              email: decodedToken.email,
              name: decodedToken.name,
              picture: decodedToken.picture,
            };
          } catch (error) {
            console.warn('Optional auth failed, continuing as guest:', error);
          }
        }
      }

      return await handler(req as AuthenticatedRequest);

    } catch (error) {
      console.error('Optional auth middleware error:', error);
      return await handler(req as AuthenticatedRequest);
    }
  };
}

// Error response helper
export function createErrorResponse(message: string, status: number = 400) {
  return NextResponse.json(
    { 
      error: message,
      timestamp: new Date().toISOString()
    },
    { status }
  );
}

// Success response helper
export function createSuccessResponse(data: any, status: number = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString()
    },
    { status }
  );
}
