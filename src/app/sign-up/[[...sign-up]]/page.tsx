'use client';

import Link from 'next/link';
import { SignUp } from '@clerk/nextjs';

const clerkAppearance = {
  layout: {
    logoPlacement: 'none' as const,
    showOptionalFields: true,
    socialButtonsPlacement: 'bottom' as const,
  },
  elements: {
    rootBox: 'w-full max-w-md mx-auto',
    card: 'bg-card border border-border shadow-lg w-full rounded-xl',
    headerTitle: 'text-foreground font-medium text-lg',
    headerSubtitle: 'text-muted-foreground text-sm font-normal',
    socialButtonsBlockButton:
      'border-border bg-background text-foreground hover:bg-muted font-normal',
    formFieldLabel: 'text-foreground font-normal text-sm',
    formFieldInput: 'bg-background border-border text-foreground font-normal',
    formButtonPrimary:
      'bg-primary text-primary-foreground hover:bg-primary/90 font-normal shadow-none',
    footerActionLink: 'text-primary hover:text-primary/80 font-normal',
    footer: 'hidden !important',
    footerAction: 'hidden',
    logoBox: 'hidden !important',
    logoImage: 'hidden !important',
    developmentModeNotice: 'hidden !important',
    footerPages: 'hidden !important',
    badge: 'hidden',
  },
};

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-6">
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
          appearance={clerkAppearance}
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
