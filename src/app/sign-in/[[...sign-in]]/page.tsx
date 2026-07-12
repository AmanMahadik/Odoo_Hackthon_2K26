'use client';

import Link from 'next/link';
import { SignIn } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { buildClerkAppearance } from '@/lib/clerkAppearance';
import AuthShell from '@/components/auth/AuthShell';

export default function SignInPage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted
    ? resolvedTheme === 'dark'
    : typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;

  const appearance = buildClerkAppearance(isDark, dark);

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your fleet operations account"
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/sign-up" className="text-primary hover:underline font-normal">
            Create one
          </Link>
        </>
      }
    >
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        forceRedirectUrl="/"
        appearance={appearance}
      />
    </AuthShell>
  );
}
