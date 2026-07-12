import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

/**
 * Keep auth on our domain only.
 * Do NOT use auth.redirectToSignIn() — that sends users to *.accounts.dev.
 * Always redirect same-origin to /sign-in.
 */
export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  const { userId } = await auth();
  if (!userId) {
    const signIn = new URL('/sign-in', req.url);
    const returnTo = req.nextUrl.pathname + req.nextUrl.search;
    if (
      returnTo &&
      returnTo !== '/' &&
      !returnTo.startsWith('/sign-in') &&
      !returnTo.startsWith('/sign-up')
    ) {
      signIn.searchParams.set('redirect_url', returnTo);
    }
    return NextResponse.redirect(signIn);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
