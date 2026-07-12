'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignOutButton } from '@clerk/nextjs';
import { useRole, getRoleSidebar } from '@/lib/roleContext';
import { 
  LayoutDashboard, Truck, Users, Navigation, Wrench, DollarSign, BarChart3, Bell, ShieldAlert, ShieldCheck, UserCheck, TrendingUp, CircleDot, LogOut, MapPin, Brain, Monitor, Menu, X, Settings, User, Briefcase, type LucideIcon
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

// Icon lookup map
const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard, Truck, Users, Navigation, Wrench, DollarSign, BarChart3, Bell, ShieldAlert, ShieldCheck, UserCheck, TrendingUp, CircleDot, LogOut, MapPin, Brain, Monitor, Briefcase
};

interface ShellProps {
  children: React.ReactNode;
}

export default function Shell({ children }: ShellProps) {
  const pathname = usePathname();
  const { role, profile } = useRole();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Notifications feed (would be fetched from API in real implementation)
  const notifications: any[] = [];

  const sidebarItems = getRoleSidebar(role);

  const currentPage = sidebarItems.find(item => item.path === pathname)?.name 
    || sidebarItems.flatMap(i => i.subItems || []).find(sub => sub.path === pathname)?.name
    || pathname.split('/').pop()?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') 
    || 'Dashboard';

  if (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up')) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background font-sans antialiased">
      {/* Top Header & Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex h-16 items-center justify-between relative">
            {/* Logo / Brand (Left) */}
            <div className="flex items-center gap-2 flex-1">
              <span className="font-semibold text-lg tracking-tight">TransitOps</span>
              <Badge variant="secondary" className="ml-1 text-[9px] uppercase tracking-wider py-0 leading-tight hidden sm:flex">
                {role}
              </Badge>
            </div>

            {/* Desktop Tabs Navigation (Center Pill) */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center justify-center">
              <nav className="flex items-center space-x-1 bg-muted/50 border border-border rounded-full p-1 shadow-sm">
                {sidebarItems.map((item) => {
                  const Icon = iconMap[item.icon] || LayoutDashboard;
                  const isActive = pathname === item.path || (item.subItems && item.subItems.some(sub => sub.path === pathname));
                  
                  if (item.subItems) {
                    return (
                      <DropdownMenu key={item.name}>
                        <DropdownMenuTrigger className={`relative flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-all rounded-full outline-none cursor-pointer ${isActive ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                           <Icon className="h-4 w-4" />
                           {item.name}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" className="w-48 rounded-xl">
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
                      className={`relative flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-all rounded-full ${
                        isActive ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
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
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                      {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'A'}
                    </AvatarFallback>
                  </Avatar>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Account & Settings</DialogTitle>
                    <DialogDescription>
                      Manage your profile, themes, and verify credentials.
                    </DialogDescription>
                  </DialogHeader>
                  <Tabs defaultValue="profile" className="w-full mt-4">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="profile">Profile</TabsTrigger>
                      <TabsTrigger value="verification">Verification</TabsTrigger>
                      <TabsTrigger value="theme">Theme</TabsTrigger>
                      <TabsTrigger value="system">System</TabsTrigger>
                    </TabsList>
                    <TabsContent value="profile" className="p-4 border rounded-md mt-4">
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-16 w-16">
                            <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'A'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="text-lg font-bold">{profile?.full_name || 'Auth User'}</h3>
                            <Badge className="mt-1">{role}</Badge>
                          </div>
                        </div>
                        <Separator />
                        <SignOutButton>
                          <Button variant="destructive" className="w-full">
                            <LogOut className="mr-2 h-4 w-4" />
                            Sign Out
                          </Button>
                        </SignOutButton>
                      </div>
                    </TabsContent>
                    <TabsContent value="verification" className="p-4 border rounded-md mt-4">
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <ShieldCheck className="h-5 w-5 text-green-500" />
                          Driver Credentials
                        </h3>
                        <p className="text-sm text-muted-foreground">Your driver credentials have been verified by the OCR engine.</p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">License No:</span>
                            <p className="font-medium">DL-84920485</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Status:</span>
                            <p className="font-medium text-green-500">Active</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Class:</span>
                            <p className="font-medium">CDL-A</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Expires:</span>
                            <p className="font-medium">10/24/2028</p>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="theme" className="p-4 border rounded-md mt-4">
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Appearance</h3>
                        <p className="text-sm text-muted-foreground">Customize the interface theme.</p>
                        <div className="flex gap-4">
                          <Button variant="outline" className="flex-1">Light</Button>
                          <Button variant="default" className="flex-1">Dark</Button>
                          <Button variant="outline" className="flex-1">System</Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">*Note: The theme applies standard Shadcn tokens.</p>
                      </div>
                    </TabsContent>
                    <TabsContent value="system" className="p-4 border rounded-md mt-4">
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg">System Information</h3>
                        <div className="text-sm space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Platform Version:</span>
                            <span className="font-medium">v2.4.0-ultra</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">API Status:</span>
                            <span className="font-medium text-green-500 flex items-center gap-1"><CircleDot className="h-3 w-3" /> Online</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Telemetry:</span>
                            <span className="font-medium text-green-500 flex items-center gap-1"><CircleDot className="h-3 w-3" /> Live</span>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
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

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">{currentPage}</h1>
        </div>
        {children}
      </main>
    </div>
  );
}
