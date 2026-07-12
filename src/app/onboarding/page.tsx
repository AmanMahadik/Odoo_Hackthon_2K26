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
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  TrendingUp,
  Truck,
  AlertTriangle,
  Navigation,
  Wrench,
  Check,
  Info,
  Briefcase,
  Sparkles,
} from 'lucide-react';

const roles: {
  id: Role;
  title: string;
  description: string;
  icon: React.ElementType;
  recommended?: boolean;
}[] = [
  {
    id: 'Fleet Manager',
    title: 'Fleet Manager',
    description: 'Full ops console — fleet, dispatch, safety, service, and insights.',
    icon: Briefcase,
    recommended: true,
  },
  {
    id: 'Dispatcher',
    title: 'Dispatcher',
    description: 'Assign trips and check driver / vehicle availability.',
    icon: Navigation,
  },
  {
    id: 'Safety Officer',
    title: 'Safety Officer',
    description: 'Safety Command, licenses, compliance, and workshop visibility.',
    icon: ShieldCheck,
  },
  {
    id: 'Financial Analyst',
    title: 'Financial Analyst',
    description: 'Fuel, expenses, ROI reports, war room, and economics.',
    icon: TrendingUp,
  },
  {
    id: 'Maintenance Technician',
    title: 'Maintenance Technician',
    description: 'Work orders, fleet units, and predictive service alerts.',
    icon: Wrench,
  },
  {
    id: 'Driver',
    title: 'Driver',
    description: 'View trips, log fuel, and report vehicle issues from the road.',
    icon: Truck,
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
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center gap-1">
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
          <CardHeader className="pb-4 space-y-3 text-center sm:text-left">
            <CardTitle className="text-xl font-medium tracking-tight">
              Complete your profile
            </CardTitle>
            <CardDescription className="font-normal">
              Choose your workspace role to open the matching dashboard and navigation.
            </CardDescription>

            {/* Evaluation / authority note — reads as product copy, not a last-minute banner */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-left">
              <Info className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" className="font-normal text-[10px] h-5">
                    Evaluation mode
                  </Badge>
                  <Badge variant="outline" className="font-normal text-[10px] h-5 gap-1">
                    <Sparkles className="h-3 w-3" />
                    Recommended for best experience
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-normal leading-relaxed">
                  In production, <span className="text-foreground font-medium">Fleet Manager</span>{' '}
                  (or a single upper authority) is normally provisioned once for the org. For this
                  evaluation build, that role is open so reviewers can explore the full platform —
                  pick <span className="text-foreground font-medium">Fleet Manager</span> for the
                  richest walkthrough.
                </p>
              </div>
            </div>
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
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-medium text-foreground">{r.title}</span>
                              {r.recommended && (
                                <Badge
                                  variant="secondary"
                                  className="font-normal text-[9px] h-4 px-1.5"
                                >
                                  Recommended
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground leading-snug font-normal">
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
