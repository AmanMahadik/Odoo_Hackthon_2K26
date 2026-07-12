'use client';

import * as React from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useTheme } from 'next-themes';
import { buildClerkAppearance } from '@/lib/clerkAppearance';

/**
 * ClerkProvider that follows next-themes light/dark (including system).
 * Must render under ThemeProvider.
 */
export function ClerkThemeProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid wrong flash: prefer system until mounted, then follow resolved theme
  const isDark =
    mounted
      ? resolvedTheme === 'dark'
      : typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;

  const appearance = React.useMemo(
    () => buildClerkAppearance(isDark, dark),
    [isDark]
  );

  return <ClerkProvider appearance={appearance}>{children}</ClerkProvider>;
}
