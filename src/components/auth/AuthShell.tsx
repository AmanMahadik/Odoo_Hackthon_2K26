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
 * Shared branded frame for sign-in / sign-up — logo + name tight and centered.
 */
export default function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-dvh w-full flex flex-col items-center justify-center bg-background relative overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-muted/40 via-background to-background" />
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-[32rem] rounded-full bg-foreground/[0.03] blur-3xl" />

      <div className="relative z-10 w-full max-w-md space-y-6 flex flex-col items-center">
        {/* Brand — centered, tight logo↔name gap */}
        <div className="w-full flex flex-col items-center text-center space-y-2.5">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-1 rounded-lg hover:opacity-90 transition-opacity"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon/light.png"
              alt=""
              className="h-9 w-auto dark:hidden shrink-0"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon/dark.png"
              alt=""
              className="h-9 w-auto hidden dark:block shrink-0"
            />
            <span className="text-xl font-medium tracking-tight text-foreground leading-none pl-0.5">
              TransitOps
            </span>
          </Link>
          <div className="space-y-0.5">
            <h1 className="text-lg font-medium tracking-tight text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground font-normal">{subtitle}</p>
          </div>
        </div>

        {/* Form card */}
        <div className="w-full rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-1 shadow-sm">
          <div className="rounded-xl px-1 py-1">{children}</div>
        </div>

        <div className="w-full text-center text-sm text-muted-foreground font-normal">{footer}</div>

        <p className="text-center text-[10px] text-muted-foreground/70 tracking-wide uppercase">
          Smart transport operations
        </p>
      </div>
    </div>
  );
}
