import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Helper type for the handler function
type RouteHandler = (req: NextRequest) => Promise<NextResponse>;

export function withAuth(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest) => {
    try {
      // Get the session cookie or token from the request
      const token = req.headers.get('Authorization')?.split('Bearer ')[1];
      
      if (!token) {
        return NextResponse.json(
          { error: 'No authentication token provided' }, 
          { status: 401 }
        );
      }

      // Create new headers without modifying the original request
      const headers = new Headers(req.headers);
      headers.set('Authorization', `Bearer ${token}`);

      // Instead of creating a new request, extend the existing one
      req.headers.set('Authorization', `Bearer ${token}`);

      return handler(req);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json(
        { error: 'Authentication failed' }, 
        { status: 401 }
      );
    }
  };
}