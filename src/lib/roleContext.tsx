'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Role = 'Fleet Manager' | 'Dispatcher' | 'Safety Officer' | 'Financial Analyst' | 'Driver';

interface RoleContextType {
  role: Role;
  setRole: (role: Role) => void;
  canAccess: (resource: string, action: 'create' | 'read' | 'update' | 'delete' | 'dispatch' | 'export') => boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>('Fleet Manager');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedRole = localStorage.getItem('transitops_sim_role') as Role;
    if (savedRole) {
      setRoleState(savedRole);
    }
    setMounted(true);
  }, []);

  const setRole = (newRole: Role) => {
    setRoleState(newRole);
    localStorage.setItem('transitops_sim_role', newRole);
  };

  // Enforce the RBAC Matrix from the specifications
  const canAccess = (resource: string, action: string): boolean => {
    switch (role) {
      case 'Fleet Manager':
        return true; // Fleet manager has full control
      
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
    <RoleContext.Provider value={{ role, setRole, canAccess }}>
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
