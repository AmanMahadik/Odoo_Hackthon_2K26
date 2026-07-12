'use client';

import Link from 'next/link';
import { SignUp } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { buildClerkAppearance } from '@/lib/clerkAppearance';
import AuthShell from '@/components/auth/AuthShell';

export default function SignUpPage() {
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
      title="Create your account"
      subtitle="Join TransitOps — choose your role after sign-up"
      footer={
        <>
          Already have an account?{' '}
          <Link href="/sign-in" className="text-primary hover:underline font-normal">
            Sign in
          </Link>
        </>
      }
    >
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        forceRedirectUrl="/onboarding"
        fallbackRedirectUrl="/onboarding"
        appearance={appearance}
      />
    </AuthShell>
  );
}
