'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole, Role } from '@/lib/roleContext';
import { db } from '@/lib/db';
import { 
  LayoutDashboard, 
  Truck, 
  Users, 
  Navigation, 
  Wrench, 
  IndianRupee, 
  BarChart3, 
  Bell, 
  ShieldAlert, 
  UserCheck,
  TrendingUp,
  CircleDot,
  LogOut
} from 'lucide-react';

interface ShellProps {
  children: React.ReactNode;
}

export default function Shell({ children }: ShellProps) {
  const pathname = usePathname();
  const { role, setRole, profile, signOut, isSandboxMode, theme } = useRole();
  const [showNotifications, setShowNotifications] = useState(false);

  const [notifications, setNotifications] = useState<{ id: string; type: string; text: string; time: string }[]>([]);

  useEffect(() => {
    async function loadNotifications() {
      try {
        const data = await db.getNotifications();
        setNotifications(data);
      } catch (err) {
        console.error(err);
      }
    }
    if (pathname !== '/login') {
      loadNotifications();
      const interval = setInterval(loadNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [pathname]);

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Vehicles Registry', path: '/vehicles', icon: Truck },
    { name: 'Driver Registry', path: '/drivers', icon: Users },
    { name: 'Trip Board', path: '/trips', icon: Navigation },
    { name: 'Maintenance', path: '/maintenance', icon: Wrench },
    { name: 'Fuel & Expenses', path: '/fuel-expenses', icon: IndianRupee },
    { name: 'Reports & ROI', path: '/reports', icon: BarChart3 },
  ];

  const roles: Role[] = ['Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst', 'Driver'];

  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className={`flex min-h-screen font-sans antialiased transition-colors duration-300 ${
      theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-[#0B0F19] text-slate-100'
    }`}>
      {/* Sidebar */}
      <aside className={`w-64 border-r flex flex-col justify-between fixed top-0 bottom-0 left-0 z-20 print:hidden ${
        theme === 'light' ? 'bg-[#0f1222] border-slate-800' : 'bg-[#0F1424]/90 border-slate-800'
      }`}>
        <div>
          {/* Logo */}
          <div className="p-6 flex items-center gap-3 border-b border-slate-880 bg-gradient-to-r from-blue-600/20 to-purple-600/0">
            <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-lg shadow-lg shadow-blue-500/30">
              <Truck className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
                TransitOps
              </span>
              <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                Fleet Controller
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/10 text-blue-400 border border-blue-500/20 shadow-md shadow-blue-500/5'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  <Icon className={`h-5 w-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-300'}`} />
                  {item.name}
                  {item.name === 'Maintenance' && (
                    <span className="ml-auto flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen print:pl-0">
        {/* Top Navbar */}
        <header className={`h-16 border-b px-8 flex items-center justify-between sticky top-0 z-10 print:hidden backdrop-blur-md ${
          theme === 'light' ? 'bg-white/70 border-slate-200 text-slate-800' : 'bg-[#0F1424]/40 border-slate-800 text-slate-200'
        }`}>
          <div>
            <h1 className={`text-lg font-bold transition-colors ${
              theme === 'light' ? 'text-slate-900' : 'text-slate-200'
            }`}>
              {pathname === '/' 
                ? 'Operations Dashboard' 
                : pathname === '/profile' 
                ? 'Account Settings' 
                : menuItems.find(m => m.path === pathname)?.name || 'TransitOps'}
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Real-time Fleet Status & Telematics
            </p>
          </div>

          <div className="flex items-center gap-6">
            {/* Active Role Indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#171d33] border border-slate-700/80 rounded-full text-xs font-semibold text-slate-300">
              <UserCheck className="h-3.5 w-3.5 text-blue-400" />
              Mode: <span className="text-blue-400">{role}</span>
            </div>

            {/* Notification Badge */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-xl transition-all cursor-pointer"
              >
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-blue-500"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-[#12162B] border border-slate-800 rounded-2xl shadow-xl overflow-hidden z-30 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-slate-800 bg-gradient-to-r from-blue-900/10 to-indigo-900/10 flex justify-between items-center">
                    <span className="font-semibold text-sm">Compliance Alerts</span>
                    <span className="text-[10px] text-blue-400 font-bold px-2 py-0.5 bg-blue-500/10 rounded-full">{notifications.length} Alerts</span>
                  </div>
                  <div className="divide-y divide-slate-800/80">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500">No new alerts</div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="p-4 hover:bg-slate-800/20 transition-colors flex gap-3">
                          <div className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 h-fit shrink-0">
                            <ShieldAlert className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-300 font-medium leading-relaxed">{n.text}</p>
                            <span className="text-[10px] text-slate-500 block mt-1">{n.time}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div className="p-2 border-t border-slate-800/80 bg-[#0F1424]">
                      <button 
                        onClick={() => setNotifications([])}
                        className="w-full py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profile Avatar & Sign Out */}
            <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
              <Link href="/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
                  {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'A'}
                </div>
                <div className="text-left hidden md:block">
                  <span className="block text-xs font-semibold text-slate-200 truncate max-w-[120px]" title={profile?.full_name || 'Aman Mahadik'}>
                    {profile?.full_name || 'Aman Mahadik'}
                  </span>
                  <span className="block text-[10px] text-slate-500 font-medium">
                    {role} {isSandboxMode ? '(Sandbox)' : ''}
                  </span>
                </div>
              </Link>
              <button
                onClick={signOut}
                title="Sign Out"
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer ml-1"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Content Wrapper */}
        <main className={`flex-grow p-8 print:p-0 print:bg-transparent ${
          theme === 'light' ? 'bg-slate-50' : 'bg-gradient-to-b from-[#0B0F19] to-[#080B12]'
        }`}>
          {children}
        </main>
      </div>
    </div>
  );
}
