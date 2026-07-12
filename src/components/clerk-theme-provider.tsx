'use client';

import * as React from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useTheme } from 'next-themes';
import { buildClerkAppearance } from '@/lib/clerkAppearance';
import { getClerkAuthUrls } from '@/lib/authUrls';

/**
 * ClerkProvider under ThemeProvider.
 * Uses absolute app /sign-in & /sign-up so production never opens *.accounts.dev UI.
 */
export function ClerkThemeProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted
    ? resolvedTheme === 'dark'
    : typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;

  const appearance = React.useMemo(
    () => buildClerkAppearance(isDark, dark),
    [isDark]
  );

  // Recompute after mount so origin is the real browser host (odoo.knokvik.app)
  const urls = React.useMemo(() => getClerkAuthUrls(), [mounted]);

  return (
    <ClerkProvider
      key={mounted ? `clerk-${urls.signInUrl}` : 'clerk-ssr'}
      appearance={appearance}
      signInUrl={urls.signInUrl}
      signUpUrl={urls.signUpUrl}
      signInFallbackRedirectUrl={urls.afterSignInUrl}
      signUpFallbackRedirectUrl={urls.afterSignUpUrl}
      signInForceRedirectUrl={urls.afterSignInUrl}
      afterSignOutUrl={urls.afterSignOutUrl}
      // Prefer path-based components over Account Portal
      allowedRedirectOrigins={[
        typeof window !== 'undefined' ? window.location.origin : '',
        process.env.NEXT_PUBLIC_APP_URL || '',
        'https://odoo.knokvik.app',
        'http://localhost:3000',
      ].filter(Boolean)}
    >
      {children}
    </ClerkProvider>
  );
}
