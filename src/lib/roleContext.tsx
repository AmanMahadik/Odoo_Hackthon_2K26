'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';
import { useRouter, usePathname } from 'next/navigation';

export type Role = 'Fleet Manager' | 'Dispatcher' | 'Safety Officer' | 'Financial Analyst' | 'Driver';

interface UserProfile {
  id: string;
  full_name: string;
  role: Role;
  contact_number?: string;
}

interface RoleContextType {
  role: Role;
  setRole: (role: Role) => void;
  user: any;
  profile: UserProfile | null;
  loading: boolean;
  isSandboxMode: boolean;
  login: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, role: Role) => Promise<{ error: any; data: any }>;
  signOut: () => Promise<void>;
  enterSandbox: (selectedRole: Role) => void;
  canAccess: (resource: string, action: 'create' | 'read' | 'update' | 'delete' | 'dispatch' | 'export') => boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>('Fleet Manager');
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSandboxMode, setIsSandboxMode] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Load session from Supabase on mount
  useEffect(() => {
    async function loadSession() {
      try {
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
        console.warn("Profile fetch error, creating placeholder profile:", error);
        // Fallback profile if DB table is missing
        const fallbackProfile: UserProfile = {
          id: userId,
          full_name: 'Auth User',
          role: 'Fleet Manager'
        };
        setProfile(fallbackProfile);
        setRoleState('Fleet Manager');
      }
    } catch (err) {
      console.error(err);
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

  return (
    <RoleContext.Provider value={{ 
      role, setRole, user, profile, loading, isSandboxMode, 
      login, signUp, signOut, enterSandbox, canAccess 
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
