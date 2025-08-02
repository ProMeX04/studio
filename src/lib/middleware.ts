import { NextRequest, NextResponse } from 'next/server';

// Rate limiting store (in production, use Redis)
const rateLimit = new Map<string, { count: number; resetTime: number }>();

export function corsMiddleware(response: NextResponse) {
  // Set CORS headers
  response.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  
  return response;
}

export function rateLimitMiddleware(
  req: NextRequest,
  options: {
    windowMs: number;
    maxRequests: number;
    keyGenerator?: (req: NextRequest) => string;
  }
) {
  const key = options.keyGenerator ? options.keyGenerator(req) : getClientIP(req);
  const now = Date.now();
  const windowStart = now - options.windowMs;

  // Clean up old entries
  for (const [k, v] of rateLimit.entries()) {
    if (v.resetTime < windowStart) {
      rateLimit.delete(k);
    }
  }

  // Get current count for this key
  const current = rateLimit.get(key);
  
  if (!current) {
    rateLimit.set(key, { count: 1, resetTime: now + options.windowMs });
    return null; // No rate limit exceeded
  }

  if (current.resetTime < now) {
    // Reset window
    rateLimit.set(key, { count: 1, resetTime: now + options.windowMs });
    return null;
  }

  if (current.count >= options.maxRequests) {
    return NextResponse.json(
      { 
        error: 'Too many requests',
        retryAfter: Math.ceil((current.resetTime - now) / 1000)
      },
      { status: 429 }
    );
  }

  // Increment count
  current.count++;
  return null;
}

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

// Security headers middleware
export function securityHeaders(response: NextResponse) {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  return response;
}

// Request logging middleware
export function requestLogger(req: NextRequest) {
  const start = Date.now();
  const method = req.method;
  const url = req.url;
  const userAgent = req.headers.get('user-agent');
  const ip = getClientIP(req);
  
  console.log(`📥 ${method} ${url} - ${ip} - ${userAgent}`);
  
  return () => {
    const duration = Date.now() - start;
    console.log(`📤 ${method} ${url} - ${duration}ms`);
  };
}

// Combined middleware wrapper
export function withMiddleware(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: {
    enableCors?: boolean;
    enableRateLimit?: boolean;
    rateLimitOptions?: {
      windowMs: number;
      maxRequests: number;
      keyGenerator?: (req: NextRequest) => string;
    };
    enableSecurity?: boolean;
    enableLogging?: boolean;
  } = {}
) {
  const {
    enableCors = true,
    enableRateLimit = false,
    rateLimitOptions = { windowMs: 60000, maxRequests: 100 },
    enableSecurity = true,
    enableLogging = true
  } = options;

  return async (req: NextRequest): Promise<NextResponse> => {
    // Request logging
    const logEnd = enableLogging ? requestLogger(req) : () => {};

    try {
      // Handle preflight CORS requests
      if (enableCors && req.method === 'OPTIONS') {
        const response = new NextResponse(null, { status: 200 });
        logEnd();
        return corsMiddleware(response);
      }

      // Rate limiting
      if (enableRateLimit) {
        const rateLimitResponse = rateLimitMiddleware(req, rateLimitOptions);
        if (rateLimitResponse) {
          logEnd();
          return rateLimitResponse;
        }
      }

      // Call the actual handler
      let response = await handler(req);

      // Apply CORS headers
      if (enableCors) {
        response = corsMiddleware(response);
      }

      // Apply security headers
      if (enableSecurity) {
        response = securityHeaders(response);
      }

      logEnd();
      return response;

    } catch (error) {
      console.error('Middleware error:', error);
      logEnd();
      
      const errorResponse = NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
      
      return enableCors ? corsMiddleware(errorResponse) : errorResponse;
    }
  };
}
