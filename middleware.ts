import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

/**
 * Always send unauthenticated users to our branded /sign-in page —
 * never Clerk Account Portal hosted UI (purple default theme).
 */
export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  const { userId } = await auth();
  if (!userId) {
    const signIn = new URL('/sign-in', req.url);
    // Preserve where they were going
    const returnTo = req.nextUrl.pathname + req.nextUrl.search;
    if (returnTo && returnTo !== '/') {
      signIn.searchParams.set('redirect_url', returnTo);
    }
    return NextResponse.redirect(signIn);
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
