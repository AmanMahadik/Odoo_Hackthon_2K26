'use client';

import * as React from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useTheme } from 'next-themes';
import { buildClerkAppearance } from '@/lib/clerkAppearance';

/**
 * ClerkProvider under ThemeProvider so appearance follows light/dark.
 * Hardcodes sign-in/up paths so production never falls back to Clerk hosted UI.
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

  return (
    <ClerkProvider
      appearance={appearance}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/onboarding"
      afterSignOutUrl="/sign-in"
    >
      {children}
    </ClerkProvider>
  );
}
