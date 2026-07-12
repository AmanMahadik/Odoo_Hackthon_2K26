'use client';

import Link from 'next/link';
import { SignUp } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { buildClerkAppearance } from '@/lib/clerkAppearance';

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
    <div className="min-h-dvh w-full flex flex-col items-center justify-center bg-background px-4 py-8 sm:py-10">
      <div className="w-full max-w-md my-auto space-y-5 sm:space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center gap-1.5">
            <img src="/icon/light.png" alt="TransitOps" className="h-9 w-auto dark:hidden" />
            <img src="/icon/dark.png" alt="TransitOps" className="h-9 w-auto hidden dark:block" />
            <span className="text-lg font-medium tracking-tight">TransitOps</span>
          </div>
          <p className="text-sm text-muted-foreground font-normal">
            Create your TransitOps account — choose your role after sign-up
          </p>
        </div>
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          forceRedirectUrl="/onboarding"
          appearance={appearance}
        />
        <p className="text-center text-sm text-muted-foreground font-normal">
          Already have an account?{' '}
          <Link href="/sign-in" className="text-primary hover:underline font-normal">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
