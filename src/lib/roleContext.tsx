'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';
import { useRouter, usePathname } from 'next/navigation';
import { db } from './db';

export type Role = 'Fleet Manager' | 'Dispatcher' | 'Safety Officer' | 'Financial Analyst' | 'Driver';

export type Theme = 'light' | 'dark';

interface UserProfile {
  id: string;
  full_name: string;
  role: Role;
  email?: string;
  contact_number?: string;
}

interface RoleContextType {
  role: Role;
  setRole: (role: Role) => void;
  user: any;
  profile: UserProfile | null;
  loading: boolean;
  isSandboxMode: boolean;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  login: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, role: Role) => Promise<{ error: any; data: any }>;
  signOut: () => Promise<void>;
  enterSandbox: (selectedRole: Role) => void;
  canAccess: (resource: string, action: 'create' | 'read' | 'update' | 'delete' | 'dispatch' | 'export') => boolean;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>('Fleet Manager');
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSandboxMode, setIsSandboxMode] = useState(false);
  const [theme, setThemeState] = useState<Theme>('dark');
  const router = useRouter();
  const pathname = usePathname();

  // Load session and theme from local storage / Supabase on mount
  useEffect(() => {
    async function loadSession() {
      try {
        // Load theme
        const savedTheme = localStorage.getItem('transitops_theme') as Theme;
        if (savedTheme) {
          setThemeState(savedTheme);
        } else {
          localStorage.setItem('transitops_theme', 'dark');
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setUser(session.user);
          await fetchProfile(session.user.id);
          setIsSandboxMode(false);
        } else {
          // Check local sandbox mode session
          const sandboxRole = localStorage.getItem('transitops_sandbox_role') as Role;
          if (sandboxRole) {
            setRoleState(sandboxRole);
            setIsSandboxMode(true);
            setProfile({
              id: 'sandbox_user',
              full_name: 'Sandbox Admin',
              role: sandboxRole
            });
          }
        }
      } catch (err) {
        console.error("Error loading session:", err);
      } finally {
        setLoading(false);
      }
    }

    loadSession();

    // Subscribe to auth state updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setUser(session.user);
        await fetchProfile(session.user.id);
        setIsSandboxMode(false);
      } else {
        setUser(null);
        setProfile(null);
        // Do not clear sandbox role unless explicitly logging out
        const sandboxRole = localStorage.getItem('transitops_sandbox_role') as Role;
        if (sandboxRole) {
          setIsSandboxMode(true);
          setRoleState(sandboxRole);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (loading) return;
    const isAuthPage = pathname === '/login';
    const isSandboxSession = localStorage.getItem('transitops_sandbox_role');
    
    if (!user && !isSandboxSession && !isAuthPage) {
      router.push('/login');
    }
  }, [user, loading, pathname, router]);

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (!error && data) {
        setProfile(data);
        setRoleState(data.role);
      } else {
        // Profile row is missing in Supabase! Auto-backfill using user metadata immediately
        const { data: { session } } = await supabase.auth.getSession();
        const metadata = session?.user?.user_metadata;
        const fallbackProfile: UserProfile = {
          id: userId,
          full_name: metadata?.full_name || 'Auth User',
          role: (metadata?.role as Role) || 'Fleet Manager',
          email: session?.user?.email || ''
        };
        
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([fallbackProfile])
          .select()
          .single();
          
        if (!insertError && newProfile) {
          setProfile(newProfile);
          setRoleState(newProfile.role);
        } else {
          setProfile(fallbackProfile);
          setRoleState(fallbackProfile.role);
        }
      }
    } catch (err) {
      console.error("fetchProfile error:", err);
    }
  }

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.user) {
      setUser(data.user);
      await fetchProfile(data.user.id);
      setIsSandboxMode(false);
      localStorage.removeItem('transitops_sandbox_role');
      router.push('/');
    }
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string, selectedRole: Role) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: selectedRole
        }
      }
    });
    return { error, data };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('transitops_sandbox_role');
    setUser(null);
    setProfile(null);
    setIsSandboxMode(false);
    router.push('/login');
  };

  const enterSandbox = (selectedRole: Role) => {
    localStorage.setItem('transitops_sandbox_role', selectedRole);
    setRoleState(selectedRole);
    setIsSandboxMode(true);
    setProfile({
      id: 'sandbox_user',
      full_name: 'Sandbox Admin',
      role: selectedRole
    });
    router.push('/');
  };

  const setTheme = (t: Theme) => {
    localStorage.setItem('transitops_theme', t);
    setThemeState(t);
  };

  const setRole = (newRole: Role) => {
    setRoleState(newRole);
    if (isSandboxMode) {
      localStorage.setItem('transitops_sandbox_role', newRole);
      setProfile(prev => prev ? { ...prev, role: newRole } : null);
    }
  };

  const canAccess = (resource: string, action: string): boolean => {
    switch (role) {
      case 'Fleet Manager':
        return true;
      case 'Dispatcher':
        if (resource === 'trips') return ['create', 'read', 'update', 'dispatch'].includes(action);
        if (resource === 'vehicles' || resource === 'drivers') return action === 'read';
        return false;
      case 'Safety Officer':
        if (resource === 'drivers') return ['read', 'update'].includes(action);
        if (resource === 'maintenance') return action === 'read';
        if (resource === 'notifications') return true;
        return false;
      case 'Financial Analyst':
        if (resource === 'reports') return ['read', 'export'].includes(action);
        if (resource === 'expenses' || resource === 'fuel_logs') return ['read', 'create'].includes(action);
        return false;
      case 'Driver':
        if (resource === 'trips') return ['read', 'update'].includes(action);
        return false;
      default:
        return false;
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (isSandboxMode) {
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      return;
    }
    if (user) {
      const data = await db.updateProfile(user.id, {
        ...updates,
        role: profile?.role || 'Fleet Manager'
      });
      setProfile(data);
      setRoleState(data.role);
    }
  };

  return (
    <RoleContext.Provider value={{ 
      role, setRole, user, profile, loading, isSandboxMode, theme, setTheme,
      login, signUp, signOut, enterSandbox, canAccess, updateProfile 
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
