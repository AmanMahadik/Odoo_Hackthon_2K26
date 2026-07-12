'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRole, Role, Theme } from '@/lib/roleContext';
import { db } from '@/lib/db';
import { 
  User, 
  Mail, 
  Shield, 
  Phone, 
  Check, 
  AlertCircle, 
  RefreshCw,
  Database,
  CheckCircle2,
  Sun,
  Moon,
  FileText,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

function ProfileContent() {
  const { user, profile, isSandboxMode, updateProfile, theme, setTheme, role, setRole } = useRole();
  
  const [fullName, setFullName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Migration backfill state
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillResult, setBackfillResult] = useState<{ success: boolean; count: number; message: string } | null>(null);

  // Load profile values into state
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setContactNumber(profile.contact_number || '');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      await updateProfile({
        full_name: fullName.trim(),
        contact_number: contactNumber.trim()
      });
      setSuccessMsg('Profile updated successfully!');
      setIsEditing(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to update profile details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRunBackfill = async () => {
    setBackfillLoading(true);
    setBackfillResult(null);
    try {
      const res = await db.backfillProfiles();
      setBackfillResult(res);
    } catch (err: any) {
      setBackfillResult({
        success: false,
        count: 0,
        message: err.message || 'An unexpected error occurred during profile backfill.'
      });
    } finally {
      setBackfillLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <p className="text-xs text-slate-400">Loading user profile session...</p>
      </div>
    );
  }

  // Theme styling helpers
  const cardBgClass = theme === 'light' 
    ? 'bg-white border-slate-200 shadow-sm text-slate-800' 
    : 'bg-[#0F1424]/90 border-slate-800 text-slate-200';
  const labelColorClass = theme === 'light' ? 'text-slate-500' : 'text-slate-400';
  const inputBgClass = theme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-[#161B30] border-slate-800 text-slate-200';
  const primaryTitleClass = theme === 'light' ? 'text-slate-900' : 'text-slate-100';

  const roles: Role[] = ['Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst', 'Driver'];

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <div>
        <h2 className={`text-xl font-extrabold tracking-tight ${primaryTitleClass}`}>User Account Settings</h2>
        <p className="text-xs text-slate-400">Manage security details, theme preferences, and credentials</p>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Profile Info Card */}
      <div className={`border rounded-2xl shadow-xl overflow-hidden ${cardBgClass}`}>
        <div className="p-6 border-b border-slate-800/10 bg-gradient-to-r from-blue-900/5 to-indigo-900/5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-blue-500/20">
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-extrabold text-sm">{profile.full_name}</h3>
              <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-[9px] font-bold uppercase tracking-wider mt-1 inline-block">
                {profile.role}
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              theme === 'light' 
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' 
                : 'bg-slate-800 hover:bg-slate-700 border-slate-750 text-slate-200'
            }`}
          >
            {isEditing ? 'Cancel Edit' : 'Edit Details'}
          </button>
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Aman Mahadik"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`w-full focus:border-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none transition-all ${inputBgClass}`}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Contact Number</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="e.g. +1-555-0103"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className={`w-full focus:border-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none transition-all ${inputBgClass}`}
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <><Check className="h-4 w-4" /> Save updates</>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 divide-y divide-slate-800/10">
            {/* Account Details View */}
            <div className="py-3.5 flex justify-between items-center text-xs">
              <div className={`flex items-center gap-2 ${labelColorClass}`}>
                <User className="h-4 w-4 text-blue-500" />
                <span>Full Name</span>
              </div>
              <span className="font-semibold">{profile.full_name}</span>
            </div>

            <div className="py-3.5 flex justify-between items-center text-xs">
              <div className={`flex items-center gap-2 ${labelColorClass}`}>
                <Mail className="h-4 w-4 text-blue-500" />
                <span>Email Address</span>
              </div>
              <span className="font-semibold">{user?.email || 'Sandbox Mode (Offline Session)'}</span>
            </div>

            <div className="py-3.5 flex justify-between items-center text-xs">
              <div className={`flex items-center gap-2 ${labelColorClass}`}>
                <Shield className="h-4 w-4 text-blue-500" />
                <span>Assigned Role</span>
              </div>
              <span className="font-semibold">{profile.role}</span>
            </div>

            <div className="py-3.5 flex justify-between items-center text-xs">
              <div className={`flex items-center gap-2 ${labelColorClass}`}>
                <Phone className="h-4 w-4 text-blue-500" />
                <span>Contact Number</span>
              </div>
              <span className="font-semibold">{profile.contact_number || 'Not Provided'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Website Theme Card */}
      <div className={`border p-6 rounded-2xl shadow-xl space-y-4 ${cardBgClass}`}>
        <div className="flex justify-between items-center border-b border-slate-800/10 pb-3">
          <div className="flex items-center gap-2">
            {theme === 'dark' ? <Moon className="h-5 w-5 text-indigo-400" /> : <Sun className="h-5 w-5 text-yellow-500" />}
            <div>
              <h3 className="font-extrabold text-sm">Theme Settings</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Toggle between dark mode and light mode interfaces</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme('light')}
              className={`p-2 rounded-xl border transition-all flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer ${
                theme === 'light' 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/10' 
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              <Sun className="h-4 w-4" /> Light
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`p-2 rounded-xl border transition-all flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/10' 
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Moon className="h-4 w-4" /> Dark
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-400">
          The selected theme is automatically saved to your browser session and propagates to all analytics boards, telemetry maps, and spreadsheets.
        </p>
      </div>

      {/* Developer Demo Simulator switcher */}
      <div className={`border p-6 rounded-2xl shadow-xl space-y-4 ${cardBgClass}`}>
        <div className="flex items-center gap-2 border-b border-slate-800/10 pb-3">
          <RefreshCw className="h-5 w-5 text-emerald-400" />
          <div>
            <h3 className="font-extrabold text-sm">Developer Role Simulator</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Bypass login rules for judging and demonstrating RBAC views</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <label className="text-xs font-bold text-slate-400 uppercase w-32">Select Active Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className={`flex-grow border rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none transition-all cursor-pointer ${inputBgClass}`}
          >
            {roles.map((r) => (
              <option key={r} value={r} className={theme === 'light' ? 'bg-white text-slate-800' : 'bg-[#12162B] text-slate-200'}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <p className="text-[10px] text-slate-400">
          Changing this dropdown instantly updates your permissions. Use this to easily show dashboard views of Fleet Managers, Drivers, Safety Officers, or Financial Analysts!
        </p>
      </div>

      {/* Terms & Conditions Section */}
      <div className={`border p-6 rounded-2xl shadow-xl space-y-4 ${cardBgClass}`}>
        <div className="flex items-center gap-2 border-b border-slate-800/10 pb-3">
          <FileText className="h-5 w-5 text-blue-400" />
          <div>
            <h3 className="font-extrabold text-sm">Terms & Conditions of Service</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Legal constraints and fleet telematics data privacy policies</p>
          </div>
        </div>

        <div className={`p-4 rounded-xl text-[10px] leading-relaxed max-h-32 overflow-y-auto font-mono ${
          theme === 'light' ? 'bg-slate-100 text-slate-600' : 'bg-slate-900/50 text-slate-400'
        }`}>
          <p className="font-bold mb-2">1. GPS Telematics Tracking Agreement</p>
          <p className="mb-2">TransitOps collects real-time coordinates, speed gauges, and odometer readings. By using an active driver session, operators grant the system permission to broadcast these parameters to dashboard managers for route tracking, payload checks, and maintenance notifications.</p>
          <p className="font-bold mb-2">2. Liability & Safety Rules Compliance</p>
          <p className="mb-2">Safety scores are generated algorithmically based on license checks, cargo limit safety parameters, and on-time reports. Driving privileges are automatically suspended if a safety officer reviews scores falling below thresholds or if license expiration triggers trigger compliance warnings.</p>
          <p className="font-bold mb-2">3. Account Use Restrictions</p>
          <p className="mb-2">Role credentials (Fleet Manager, Dispatcher, Safety Officer, Financial Analyst) are proprietary and governed by Row Level Security (RLS) tokens. Any attempt to bypass APIs or access unauthorized data tables triggers telemetry bans.</p>
        </div>
      </div>

      {/* Profiles Backfill Script Card */}
      {!isSandboxMode && (
        <div className={`border p-6 rounded-2xl shadow-xl space-y-4 ${cardBgClass}`}>
          <div className="flex items-center gap-2 border-b border-slate-800/10 pb-3">
            <Database className="h-5 w-5 text-indigo-400" />
            <div>
              <h3 className="font-extrabold text-sm">One-Time Profile Backfill</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Detects if your auth session is missing a profile row and seeds it</p>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Occasionally, if user signups bypass trigger hooks or triggers fail silently during database schemas adjustments, an authenticated user may be missing their matching profile row. Run this backfill script to auto-generate any missing row immediately.
          </p>

          {backfillResult && (
            <div className={`p-4 rounded-xl text-xs flex items-center gap-2 border ${
              backfillResult.success 
                ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400' 
                : 'bg-red-500/5 border-red-500/10 text-red-400'
            }`}>
              <Check className="h-4 w-4 shrink-0" />
              <div>
                <span className="font-bold block">{backfillResult.success ? 'Script Success' : 'Script Failed'}</span>
                <span className="block text-[10px] text-slate-400 mt-0.5">{backfillResult.message}</span>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={handleRunBackfill}
              disabled={backfillLoading}
              className={`px-4 py-2.5 border rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                theme === 'light' 
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-350 text-slate-700' 
                  : 'bg-[#171d33] border-indigo-500/20 hover:border-indigo-500/40 text-slate-200'
              }`}
            >
              <RefreshCw className={`h-4 w-4 text-indigo-400 ${backfillLoading ? 'animate-spin' : ''}`} />
              Run Backfill Migration
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}
