/**
 * Resolve app origin so Clerk always uses our /sign-in and /sign-up routes
 * (never *.accounts.dev Account Portal UI).
 */
export function getAppOrigin(): string {
  // Browser — always prefer live origin (works for localhost + production domain)
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }

  const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (explicit) return explicit;

  // Vercel production custom domain
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL?.replace(/\/$/, '');
  if (prod) return prod.startsWith('http') ? prod : `https://${prod}`;

  // Vercel preview / deployment host
  const vercel = process.env.VERCEL_URL?.replace(/\/$/, '');
  if (vercel) return vercel.startsWith('http') ? vercel : `https://${vercel}`;

  return '';
}

/** Absolute URLs when possible — relative fallback for local SSR without env */
export function getClerkAuthUrls() {
  const origin = getAppOrigin();
  const signInPath = '/sign-in';
  const signUpPath = '/sign-up';

  return {
    signInUrl: origin ? `${origin}${signInPath}` : signInPath,
    signUpUrl: origin ? `${origin}${signUpPath}` : signUpPath,
    signInPath,
    signUpPath,
    afterSignInUrl: origin ? `${origin}/` : '/',
    afterSignUpUrl: origin ? `${origin}/onboarding` : '/onboarding',
    afterSignOutUrl: origin ? `${origin}/sign-in` : '/sign-in',
  };
}

/** True if a URL is Clerk Account Portal (must never be used as our sign-in page) */
export function isClerkAccountsHost(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return host.endsWith('.accounts.dev') || host.includes('accounts.clerk');
  } catch {
    return url.includes('accounts.dev') || url.includes('accounts.clerk');
  }
}
