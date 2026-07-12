'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRole, Role } from '@/lib/roleContext';
import { useUser } from '@clerk/nextjs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  ShieldCheck,
  TrendingUp,
  Truck,
  AlertTriangle,
  Navigation,
  Wrench,
  Check,
} from 'lucide-react';

const roles: {
  id: Role;
  title: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    id: 'Fleet Manager',
    title: 'Fleet Manager',
    description: 'Oversees fleet assets, maintenance, vehicle lifecycle, and operational efficiency.',
    icon: Truck,
  },
  {
    id: 'Driver',
    title: 'Driver',
    description: 'View trips, log fuel, and report vehicle issues from the road.',
    icon: Truck,
  },
  {
    id: 'Safety Officer',
    title: 'Safety Officer',
    description: 'Compliance, licenses, safety scores, and workshop visibility.',
    icon: ShieldCheck,
  },
  {
    id: 'Financial Analyst',
    title: 'Financial Analyst',
    description: 'Expenses, fuel, ROI reports, and cost scenarios.',
    icon: TrendingUp,
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useUser();
  const { updateProfile, profile, loading: roleLoading } = useRole();

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [contactNumber, setContactNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!roleLoading && profile) {
      router.push('/');
    }
  }, [profile, roleLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) {
      setError('Please select a role to continue.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await updateProfile({
        full_name: user?.fullName || user?.firstName || 'System User',
        role: selectedRole,
        contact_number: contactNumber,
      });
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'An error occurred during onboarding.');
      setIsSubmitting(false);
    }
  };

  if (roleLoading || profile) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-xs text-muted-foreground font-normal">Loading profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-background px-4 py-10 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-muted/40 via-background to-background" />
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-[32rem] rounded-full bg-foreground/[0.03] blur-3xl" />

      <div className="relative z-10 w-full max-w-2xl space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon/light.png" alt="TransitOps" className="h-9 w-auto dark:hidden" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon/dark.png"
              alt="TransitOps"
              className="h-9 w-auto hidden dark:block"
            />
            <span className="text-lg font-medium tracking-tight">TransitOps</span>
          </div>
        </div>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-4 space-y-1.5 text-center sm:text-left">
            <CardTitle className="text-xl font-medium tracking-tight">
              Complete your profile
            </CardTitle>
            <CardDescription className="font-normal">
              Choose your workspace role to customize your dashboard.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs flex items-center gap-2 font-normal">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-3">
                <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Select your role
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {roles.map((r) => {
                    const Icon = r.icon;
                    const isSelected = selectedRole === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedRole(r.id)}
                        className={`relative text-left p-3.5 rounded-xl border transition-all duration-150 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          isSelected
                            ? 'border-foreground/30 bg-muted/60 shadow-sm'
                            : 'border-border bg-card hover:bg-muted/40 hover:border-border'
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                        <div className="flex items-start gap-3 pr-6">
                          <div
                            className={`p-2 rounded-lg shrink-0 border ${
                              isSelected
                                ? 'bg-background border-border text-foreground'
                                : 'bg-muted/50 border-transparent text-muted-foreground'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground">{r.title}</div>
                            <div className="text-xs text-muted-foreground mt-0.5 leading-snug font-normal">
                              {r.description}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="contact"
                  className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Contact number (optional)
                </Label>
                <Input
                  id="contact"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="font-normal h-10"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-10 font-normal"
                disabled={!selectedRole || isSubmitting}
              >
                {isSubmitting ? 'Setting up workspace…' : 'Continue to dashboard'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-[10px] text-muted-foreground/70 tracking-wide uppercase">
          Smart transport operations
        </p>
      </div>
    </div>
  );
}
