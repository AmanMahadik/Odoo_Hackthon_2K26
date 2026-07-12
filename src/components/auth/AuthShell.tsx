'use client';

import Link from 'next/link';
import React from 'react';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

/**
 * Shared branded frame for sign-in / sign-up — logo, name, theme-aware surface.
 */
export default function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-dvh w-full flex flex-col items-center justify-center bg-background relative overflow-hidden px-4 py-10">
      {/* Soft ambient background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-muted/40 via-background to-background" />
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-[32rem] rounded-full bg-foreground/[0.03] blur-3xl" />

      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="text-center space-y-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl px-2 py-1 hover:bg-muted/50 transition-colors"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon/light.png"
              alt="TransitOps"
              className="h-10 w-auto dark:hidden"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon/dark.png"
              alt="TransitOps"
              className="h-10 w-auto hidden dark:block"
            />
            <span className="text-xl font-medium tracking-tight text-foreground">
              TransitOps
            </span>
          </Link>
          <div className="space-y-1">
            <h1 className="text-lg font-medium tracking-tight text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground font-normal">{subtitle}</p>
          </div>
        </div>

        {/* Form card frame */}
        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-1 shadow-sm">
          <div className="rounded-xl px-1 py-1">{children}</div>
        </div>

        <div className="text-center text-sm text-muted-foreground font-normal">{footer}</div>

        <p className="text-center text-[10px] text-muted-foreground/70 tracking-wide uppercase">
          Smart transport operations
        </p>
      </div>
    </div>
  );
}
