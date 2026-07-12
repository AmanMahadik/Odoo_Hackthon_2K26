'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRole, Role } from '@/lib/roleContext';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ShieldCheck, User as UserIcon, Briefcase, TrendingUp, Truck, AlertTriangle } from 'lucide-react';

const roles: { id: Role; title: string; description: string; icon: React.ElementType }[] = [
  {
    id: 'Driver',
    title: 'Driver',
    description: 'View your dispatched trips, log fuel expenses, and report vehicle issues.',
    icon: Truck
  },
  {
    id: 'Fleet Manager',
    title: 'Fleet Manager',
    description: 'Full access to operations, fleet assets, dispatching, and analytics.',
    icon: Briefcase
  },
  {
    id: 'Safety Officer',
    title: 'Safety Officer',
    description: 'Monitor compliance, track driver licenses, and oversee safety scores.',
    icon: ShieldCheck
  },
  {
    id: 'Financial Analyst',
    title: 'Financial Analyst',
    description: 'Review expenses, fuel consumption, and overall fleet profitability.',
    icon: TrendingUp
  }
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useUser();
  const { updateProfile, profile, loading: roleLoading } = useRole();
  
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [contactNumber, setContactNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Redirect if they already have a profile
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
        full_name: user?.fullName || 'System User',
        role: selectedRole,
        contact_number: contactNumber
      });
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'An error occurred during onboarding.');
      setIsSubmitting(false);
    }
  };

  if (roleLoading || profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-2xl border-border shadow-xl z-10 animate-in fade-in zoom-in-95 duration-500">
        <CardHeader className="space-y-2 text-center pb-8">
          <div className="mx-auto bg-primary/10 w-12 h-12 flex items-center justify-center rounded-xl mb-2">
            <UserIcon className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Complete your profile</CardTitle>
          <CardDescription className="text-sm">
            Select your primary role in TransitOps to customize your dashboard experience.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Select Your Role</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roles.map((r) => {
                  const Icon = r.icon;
                  const isSelected = selectedRole === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRole(r.id)}
                      className={`text-left p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                        isSelected 
                          ? 'border-primary bg-primary/5 shadow-sm' 
                          : 'border-border bg-card hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg mt-0.5 ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className={`font-bold text-sm ${isSelected ? 'text-foreground' : 'text-foreground'}`}>
                            {r.title}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 leading-snug">
                            {r.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="contact" className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Contact Number (Optional)</Label>
              <input
                id="contact"
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                className="w-full bg-background border border-input focus:border-ring rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none transition-all"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full py-6 text-sm font-bold shadow-sm"
              disabled={!selectedRole || isSubmitting}
            >
              {isSubmitting ? 'Setting up workspace...' : 'Complete Setup & Enter App'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
