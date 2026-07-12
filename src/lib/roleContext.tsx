'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';
import { db } from './db';
import { useRouter, usePathname } from 'next/navigation';
import { useUser, useAuth, useClerk } from '@clerk/nextjs';

export type Role = 'Fleet Manager' | 'Dispatcher' | 'Safety Officer' | 'Financial Analyst' | 'Driver' | 'Maintenance Technician';

export type Theme = 'light' | 'dark';
export type Currency = 'USD' | 'INR';

interface UserProfile {
  id: string;
  full_name: string;
  role: Role;
  email?: string;
  contact_number?: string;
}

interface RoleContextType {
  /** null while profile is still loading — never assume Fleet Manager */
  role: Role | null;
  setRole: (role: Role) => void;
  user: any;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  canAccess: (resource: string, action: 'create' | 'read' | 'update' | 'delete' | 'dispatch' | 'export') => boolean;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  formatCurrency: (val: number) => string;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

// ============================================
// ROLE-BASED SIDEBAR CONFIGURATION
// ============================================

export interface SidebarItem {
  name: string;
  path?: string;
  icon: string; // lucide icon name
  badge?: 'alert' | 'count';
  badgeCount?: number;
  subItems?: { name: string; path: string; icon: string; badge?: 'alert' | 'count' }[];
}

export function getRoleSidebar(role: Role | null): SidebarItem[] {
  if (!role) return [];

  switch (role) {
    case 'Fleet Manager':
      return [
        { name: 'Dashboard', path: '/', icon: 'LayoutDashboard' },
        {
          name: 'Operations',
          icon: 'Briefcase',
          subItems: [
            { name: 'Vehicles', path: '/vehicles', icon: 'Truck' },
            { name: 'Drivers', path: '/drivers', icon: 'Users' },
            { name: 'Trips', path: '/trips', icon: 'Navigation' },
          ],
        },
        {
          name: 'Service',
          icon: 'Wrench',
          subItems: [
            { name: 'Maintenance', path: '/maintenance', icon: 'Wrench', badge: 'alert' },
            { name: 'Fuel & Expenses', path: '/fuel-expenses', icon: 'DollarSign' },
          ],
        },
        {
          name: 'Insights',
          icon: 'BarChart3',
          subItems: [
            { name: 'Reports', path: '/reports', icon: 'BarChart3' },
            { name: 'Prediction', path: '/ai-predictions', icon: 'Sparkles' },
            { name: 'Economics', path: '/economic-simulator', icon: 'TrendingUp' },
          ],
        },
      ];

    case 'Dispatcher':
      return [
        { name: 'Dashboard', path: '/', icon: 'LayoutDashboard' },
        {
          name: 'Operations',
          icon: 'Briefcase',
          subItems: [
            { name: 'Dispatch Board', path: '/trips', icon: 'Navigation' },
            { name: 'Driver Availability', path: '/drivers', icon: 'Users' },
            { name: 'Vehicle Availability', path: '/vehicles', icon: 'Truck' },
          ],
        },
      ];

    case 'Safety Officer':
      return [
        { name: 'Dashboard', path: '/', icon: 'LayoutDashboard' },
        {
          name: 'Compliance',
          icon: 'ShieldCheck',
          subItems: [
            { name: 'Safety Command', path: '/safety-command', icon: 'ShieldAlert' },
            { name: 'Drivers', path: '/drivers', icon: 'Users' },
            { name: 'Vehicles', path: '/vehicles', icon: 'Truck' },
          ],
        },
        {
          name: 'Service',
          icon: 'Wrench',
          subItems: [
            { name: 'Maintenance', path: '/maintenance', icon: 'Wrench' },
          ],
        },
      ];

    case 'Financial Analyst':
      return [
        { name: 'Dashboard', path: '/', icon: 'LayoutDashboard' },
        {
          name: 'Finance',
          icon: 'DollarSign',
          subItems: [
            { name: 'Fuel & Expenses', path: '/fuel-expenses', icon: 'DollarSign' },
            { name: 'Reports & ROI', path: '/reports', icon: 'BarChart3' },
            { name: 'War Room', path: '/financial-war-room', icon: 'Monitor' },
          ],
        },
        {
          name: 'Insights',
          icon: 'TrendingUp',
          subItems: [
            { name: 'Economics', path: '/economic-simulator', icon: 'TrendingUp' },
          ],
        },
      ];

    case 'Maintenance Technician':
      return [
        { name: 'Dashboard', path: '/', icon: 'LayoutDashboard' },
        {
          name: 'Workshop',
          icon: 'Wrench',
          subItems: [
            { name: 'Work Orders', path: '/maintenance', icon: 'Wrench' },
            { name: 'Fleet Units', path: '/vehicles', icon: 'Truck' },
            { name: 'Predictions', path: '/ai-predictions', icon: 'Sparkles' },
          ],
        },
      ];

    case 'Driver':
      return [
        { name: 'Dashboard', path: '/', icon: 'LayoutDashboard' },
        {
          name: 'My Work',
          icon: 'Briefcase',
          subItems: [
            { name: 'My Trips', path: '/trips', icon: 'Navigation' },
            { name: 'My Vehicle', path: '/vehicles', icon: 'Truck' },
          ],
        },
        {
          name: 'Service',
          icon: 'Wrench',
          subItems: [
            { name: 'Log Expense', path: '/fuel-expenses', icon: 'DollarSign' },
            { name: 'Report Issue', path: '/maintenance', icon: 'Wrench' },
          ],
        },
      ];

    default:
      return [{ name: 'Dashboard', path: '/', icon: 'LayoutDashboard' }];
  }
}

// ============================================
// ROUTE PERMISSIONS
// ============================================

export const routePermissions: Record<string, Role[]> = {
  '/': ['Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst', 'Driver', 'Maintenance Technician'],
  '/vehicles': ['Fleet Manager', 'Safety Officer', 'Dispatcher', 'Driver', 'Maintenance Technician'],
  '/drivers': ['Fleet Manager', 'Safety Officer', 'Dispatcher'],
  '/trips': ['Fleet Manager', 'Dispatcher', 'Driver'],
  '/maintenance': ['Fleet Manager', 'Maintenance Technician', 'Safety Officer', 'Driver'],
  '/fuel-expenses': ['Fleet Manager', 'Financial Analyst', 'Driver'],
  '/reports': ['Fleet Manager', 'Financial Analyst'],
  '/ai-predictions': ['Fleet Manager', 'Maintenance Technician'],
  '/economic-simulator': ['Fleet Manager', 'Financial Analyst'],
  '/fleet-command': ['Fleet Manager'],
  '/financial-war-room': ['Fleet Manager', 'Financial Analyst'],
  '/safety-command': ['Fleet Manager', 'Safety Officer'],
};

export function canAccessRoute(role: Role | null, path: string): boolean {
  if (!role) return false;
  const allowedRoles = routePermissions[path];
  if (!allowedRoles) return true; // Unknown routes are open
  return allowedRoles.includes(role);
}

// ============================================
// ROLE PROVIDER
// ============================================

export function RoleProvider({ children }: { children: React.ReactNode }) {
  // null until profile resolves — avoids flashing "Fleet Manager" on reload
  const [role, setRoleState] = useState<Role | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [currency, setCurrencyState] = useState<Currency>('USD');
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut: clerkSignOut } = useClerk();

  const loading = !isLoaded || profileLoading;

  // Initialize currency from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('transitops_currency') as Currency;
      if (stored === 'INR') {
        setCurrencyState('INR');
      }
    }
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    if (typeof window !== 'undefined') {
      localStorage.setItem('transitops_currency', c);
    }
  };

  useEffect(() => {
    async function fetchProfile(userId: string) {
      setProfileLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (!error && data) {
          setProfile(data);
          setRoleState((data.role as Role) || null);
        } else {
          // New user — no profile yet
          setProfile(null);
          setRoleState(null);
        }
      } catch (err) {
        console.error(err);
        setProfile(null);
        setRoleState(null);
      } finally {
        setProfileLoading(false);
      }
    }

    if (isLoaded && isSignedIn && user) {
      fetchProfile(user.id);
    } else if (isLoaded && !isSignedIn) {
      setProfile(null);
      setRoleState(null);
      setProfileLoading(false);
    }
  }, [isLoaded, isSignedIn, user]);

  // Route guard: redirect if role doesn't have access or if profile is missing
  useEffect(() => {
    if (loading || !isSignedIn) return;
    if (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up')) return;

    if (!profile && pathname !== '/onboarding') {
      router.push('/onboarding');
      return;
    }

    if (profile && pathname === '/onboarding') {
      router.push('/');
      return;
    }

    if (pathname !== '/onboarding' && role && !canAccessRoute(role, pathname)) {
      router.push('/');
    }
  }, [role, pathname, loading, router, profile, isSignedIn]);

  const signOut = async () => {
    try {
      await clerkSignOut();
    } finally {
      window.location.href = '/sign-in';
    }
  };

  const setRole = (newRole: Role) => {
    setRoleState(newRole);
  };

  const canAccess = (resource: string, action: string): boolean => {
    if (!role) return false;
    const r = role.trim() as Role;

    if (r === 'Fleet Manager') return true;

    switch (r) {
      case 'Dispatcher':
        if (resource === 'trips') return ['create', 'read', 'update', 'dispatch', 'delete'].includes(action);
        if (resource === 'vehicles' || resource === 'drivers') return action === 'read';
        return false;
      case 'Driver':
        if (resource === 'trips') return ['create', 'read', 'update', 'dispatch'].includes(action);
        if (resource === 'vehicles' || resource === 'drivers') return action === 'read';
        if (resource === 'expenses' || resource === 'fuel' || resource === 'maintenance') {
          return ['create', 'read'].includes(action);
        }
        return false;
      case 'Safety Officer':
        if (resource === 'drivers') return ['read', 'update', 'create'].includes(action);
        if (resource === 'vehicles') return ['read', 'update'].includes(action);
        if (resource === 'maintenance') return action === 'read';
        if (resource === 'safety' || resource === 'reports') return action === 'read';
        return false;
      case 'Financial Analyst':
        if (resource === 'expenses' || resource === 'fuel') return ['create', 'read', 'update', 'delete'].includes(action);
        if (resource === 'reports') return ['read', 'export'].includes(action);
        if (resource === 'vehicles' || resource === 'trips' || resource === 'maintenance') return action === 'read';
        return false;
      case 'Maintenance Technician':
        if (resource === 'maintenance') return ['create', 'read', 'update', 'delete'].includes(action);
        if (resource === 'vehicles') return ['read', 'update'].includes(action);
        if (resource === 'predictions' || resource === 'ai') return action === 'read';
        return false;
      default:
        return false;
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (user && profile) {
      const data = await db.updateProfile(user.id, {
        role: profile.role,
        ...updates,
      });
      setProfile(data);
      setRoleState(data.role);
    }
  };

  const formatCurrency = (val: number): string => {
    // Only apply conversion for specific roles
    if (role === 'Fleet Manager' || role === 'Financial Analyst') {
      if (currency === 'INR') {
        // Exchange rate assumption: 1 USD = 95.33 INR
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val * 95.33);
      }
    }
    // Default USD formatting
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  return (
    <RoleContext.Provider value={{ 
      role, setRole, user, profile, loading, 
      signOut, canAccess, updateProfile,
      currency, setCurrency, formatCurrency
    }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
