'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole, getRoleSidebar } from '@/lib/roleContext';
import LiveOpsMarquee from '@/components/layout/LiveOpsMarquee';
import { 
  LayoutDashboard, Truck, Users, Navigation, Wrench, DollarSign, BarChart3, Bell, ShieldAlert, ShieldCheck, UserCheck, TrendingUp, CircleDot, LogOut, MapPin, Brain, Monitor, Menu, X, Settings, User, Briefcase, Sparkles, Activity, type LucideIcon
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";


// Icon lookup map
const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard, Truck, Users, Navigation, Wrench, DollarSign, BarChart3, Bell, ShieldAlert, ShieldCheck, UserCheck, TrendingUp, CircleDot, LogOut, MapPin, Brain, Monitor, Briefcase, Sparkles, Activity
};

interface ShellProps {
  children: React.ReactNode;
}

export default function Shell({ children }: ShellProps) {
  const pathname = usePathname();
  const { role, profile, signOut, currency, setCurrency } = useRole();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Notifications feed (would be fetched from API in real implementation)
  const notifications: any[] = [];

  const sidebarItems = getRoleSidebar(role);

  const currentPage = sidebarItems.find(item => item.path === pathname)?.name 
    || sidebarItems.flatMap(i => i.subItems || []).find(sub => sub.path === pathname)?.name
    || pathname.split('/').pop()?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') 
    || 'Dashboard';

  if (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up') || pathname === '/onboarding') {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background font-sans antialiased">
      {/* Top Header & Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-full max-w-[1600px] mx-auto px-4 md:px-6">
          {/* 3-column grid so center nav is never covered and stays clickable */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-3.5 md:py-4 min-h-[4rem]">
            {/* Logo / Brand (Left) */}
            <Link href="/" className="flex items-center gap-1 min-w-0 justify-self-start">
              <img src="/icon/light.png" alt="TransitOps" className="h-8 w-auto dark:hidden shrink-0" />
              <img src="/icon/dark.png" alt="TransitOps" className="h-8 w-auto hidden dark:block shrink-0" />
              <span className="text-base md:text-lg tracking-tight font-medium">TransitOps</span>
              <Badge variant="secondary" className="ml-1.5 text-[9px] uppercase tracking-wider py-0 leading-tight hidden sm:flex shrink-0 font-normal">
                {role}
              </Badge>
            </Link>

            {/* Desktop Tabs Navigation (Center) — own column so nothing overlays it */}
            <nav className="hidden md:flex items-center space-x-1 bg-muted/50 border border-border rounded-full p-1 shadow-sm justify-self-center relative z-50">
              {sidebarItems.map((item) => {
                const Icon = iconMap[item.icon] || LayoutDashboard;
                const isActive = pathname === item.path || (item.subItems && item.subItems.some(sub => sub.path === pathname));
                
                if (item.subItems) {
                  return (
                    <DropdownMenu key={item.name}>
                      <DropdownMenuTrigger className={`relative flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-all rounded-full outline-none cursor-pointer pointer-events-auto ${isActive ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                         <Icon className="h-4 w-4" />
                         {item.name}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center" className="w-48 rounded-xl z-[100]">
                         {item.subItems.map(sub => {
                           const SubIcon = iconMap[sub.icon] || LayoutDashboard;
                           return (
                             <DropdownMenuItem key={sub.path} className="rounded-lg p-0">
                               <Link href={sub.path} className="flex items-center gap-2 cursor-pointer w-full px-2 py-1.5">
                                 <SubIcon className="h-4 w-4 text-muted-foreground" />
                                 {sub.name}
                               </Link>
                             </DropdownMenuItem>
                           )
                         })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )
                }

                return (
                  <Link
                    key={item.path + item.name}
                    href={item.path!}
                    className={`relative flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-all rounded-full pointer-events-auto ${
                      isActive ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2 md:gap-3 shrink-0 justify-self-end">
              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger className="relative flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer outline-none">
                  <Bell className="h-4 w-4" />
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive animate-pulse" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="flex justify-between items-center">
                      Alerts
                      <Badge variant="secondary">{notifications.length}</Badge>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  {notifications.length === 0 ? (
                    <DropdownMenuItem className="p-4 text-center text-sm text-muted-foreground">
                      No new alerts
                    </DropdownMenuItem>
                  ) : (
                    notifications.map(n => (
                      <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-1 p-3 cursor-default">
                        <div className="flex items-start gap-2">
                          <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                          <span className="text-sm">{n.text}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground ml-6">{n.time}</span>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Separator orientation="vertical" className="h-5 hidden md:block" />

              {/* Profile / Settings Dialog Trigger */}
              <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogTrigger className="relative h-8 w-8 rounded-full p-0 flex items-center justify-center hover:bg-muted transition-colors outline-none cursor-pointer">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                      {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'A'}
                    </AvatarFallback>
                  </Avatar>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[520px] max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
                  <DialogHeader className="px-4 pt-4 pb-3 border-b border-border shrink-0">
                    <DialogTitle>Account & Settings</DialogTitle>
                    <DialogDescription>
                      Profile, verification, theme, and system — all in one place. Scroll to explore.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="overflow-y-auto flex-1 px-4 py-4 space-y-6">
                    {/* Profile */}
                    <section className="space-y-3">
                      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Profile</h3>
                      <div className="rounded-xl border border-border p-4 space-y-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-16 w-16">
                            <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-medium">
                              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'A'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="text-lg font-medium">{profile?.full_name || 'Auth User'}</h4>
                            <Badge className="mt-1">{role}</Badge>
                            {profile?.email && (
                              <p className="text-xs text-muted-foreground mt-1">{profile.email}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Verification */}
                    <section className="space-y-3">
                      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Verification</h3>
                      <div className="rounded-xl border border-border p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-5 w-5 text-emerald-500" />
                          <span className="font-semibold text-sm">Driver credentials</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Credentials verified by the OCR engine and registry check.
                        </p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground text-xs">License No</span>
                            <p className="font-medium">DL-84920485</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Status</span>
                            <p className="font-medium text-emerald-500">Active</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Class</span>
                            <p className="font-medium">CDL-A</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Expires</span>
                            <p className="font-medium">10/24/2028</p>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Theme */}
                    <section className="space-y-3">
                      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Theme</h3>
                      <div className="rounded-xl border border-border p-4 space-y-3">
                        <p className="text-xs text-muted-foreground">Customize interface appearance.</p>
                        <div className="flex gap-2">
                          <Button
                            variant={mounted && theme === 'light' ? 'default' : 'outline'}
                            className="flex-1"
                            size="sm"
                            onClick={() => setTheme('light')}
                          >
                            Light
                          </Button>
                          <Button
                            variant={mounted && theme === 'dark' ? 'default' : 'outline'}
                            className="flex-1"
                            size="sm"
                            onClick={() => setTheme('dark')}
                          >
                            Dark
                          </Button>
                          <Button
                            variant={mounted && theme === 'system' ? 'default' : 'outline'}
                            className="flex-1"
                            size="sm"
                            onClick={() => setTheme('system')}
                          >
                            System
                          </Button>
                        </div>
                      </div>
                    </section>

                    {/* Currency (Role Restricted) */}
                    {(role === 'Fleet Manager' || role === 'Financial Analyst') && (
                      <section className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Currency</h3>
                        <div className="rounded-xl border border-border p-4 space-y-3">
                          <p className="text-xs text-muted-foreground">Select preferred currency for financial data.</p>
                          <div className="flex gap-2">
                            <Button
                              variant={currency === 'USD' ? 'default' : 'outline'}
                              className="flex-1"
                              size="sm"
                              onClick={() => setCurrency('USD')}
                            >
                              USD ($)
                            </Button>
                            <Button
                              variant={currency === 'INR' ? 'default' : 'outline'}
                              className="flex-1"
                              size="sm"
                              onClick={() => setCurrency('INR')}
                            >
                              INR (₹)
                            </Button>
                          </div>
                        </div>
                      </section>
                    )}

                    {/* System */}
                    <section className="space-y-3">
                      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">System</h3>
                      <div className="rounded-xl border border-border p-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Platform version</span>
                          <span className="font-medium">v2.4.0-ultra</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">API status</span>
                          <span className="font-medium text-emerald-500 flex items-center gap-1">
                            <CircleDot className="h-3 w-3" /> Online
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Telemetry</span>
                          <span className="font-medium text-emerald-500 flex items-center gap-1">
                            <CircleDot className="h-3 w-3" /> Live
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Role access</span>
                          <span className="font-medium">{role}</span>
                        </div>
                      </div>
                    </section>
                  </div>

                  <div className="px-4 py-3 border-t border-border shrink-0">
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => {
                        setSettingsOpen(false);
                        signOut();
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Mobile Menu Toggle */}
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Continuous live state ticker strip under title nav */}
      <LiveOpsMarquee />

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-card">
          <nav className="flex flex-col p-4 space-y-2">
            {sidebarItems.map((item) => {
              const Icon = iconMap[item.icon] || LayoutDashboard;
              const isActive = pathname === item.path || (item.subItems && item.subItems.some(sub => sub.path === pathname));
              
              if (item.subItems) {
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="px-3 py-2 text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <Icon className="h-4 w-4" /> {item.name}
                    </div>
                    <div className="pl-6 space-y-1">
                      {item.subItems.map(sub => {
                        const SubIcon = iconMap[sub.icon] || LayoutDashboard;
                        const isSubActive = pathname === sub.path;
                        return (
                          <Link
                            key={sub.path}
                            href={sub.path}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                              isSubActive
                                ? 'bg-primary/10 text-primary'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                          >
                            <SubIcon className="h-4 w-4" />
                            {sub.name}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )
              }

              return (
                <Link
                  key={item.path + item.name}
                  href={item.path!}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main — same max width as title bar, roomy top/bottom spacing */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 md:px-6 pt-5 md:pt-7 pb-6 md:pb-8">
        {pathname !== '/' && (
          <div className="mb-5 flex items-center justify-between">
            <h1 className="text-xl tracking-tight text-foreground font-medium">{currentPage}</h1>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
