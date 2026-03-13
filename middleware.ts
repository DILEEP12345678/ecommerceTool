import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher(['/login(.*)']);

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and public assets
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest|.*\\.(?:png|jpg|jpeg|svg|ico|webp|woff|woff2|css|js)).*)',
  ],
};
