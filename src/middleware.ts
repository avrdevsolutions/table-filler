import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Auth pages that authenticated users should be redirected away from
const AUTH_PAGES = ['/login', '/register'];

// Route prefixes that require authentication
const PROTECTED_PREFIXES = ['/businesses', '/dashboard', '/export'];

// Define allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://pontaj.avrdevelopmentsolutions.ro',
  'https://pontajapi.avrdevelopmentsolutions.ro',
  'http://localhost:3000',
  'http://localhost:3001', // for testing
];

function applyCorsHeaders(response: NextResponse, origin: string | null): NextResponse {
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin');

  // Handle API routes: apply CORS only
  if (pathname.startsWith('/api/')) {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : '',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
    return applyCorsHeaders(NextResponse.next(), origin);
  }

  const token = await getToken({ req: request });
  const isAuthenticated = !!token;

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && AUTH_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL('/businesses', request.url));
  }

  // Redirect unauthenticated users away from protected pages
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!isAuthenticated && isProtected) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Configure which routes use the middleware
export const config = {
  matcher: [
    '/api/:path*',
    '/login',
    '/register',
    '/businesses/:path*',
    '/dashboard/:path*',
    '/export/:path*',
  ],
};


