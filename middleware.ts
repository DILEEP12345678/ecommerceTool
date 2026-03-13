import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher(['/login(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and public assets
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest|.*\\.(?:png|jpg|jpeg|svg|ico|webp|woff|woff2|css|js)).*)',
  ],
};
