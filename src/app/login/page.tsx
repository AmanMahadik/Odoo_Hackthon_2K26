'use client';

import React, { useState } from 'react';
import { useRole, Role } from '@/lib/roleContext';
import { 
  Lock, 
  Mail, 
  User, 
  Shield, 
  KeyRound, 
  AlertCircle, 
  ArrowRight, 
  CircleDot, 
  Check, 
  X,
  Truck,
  CheckCircle2
} from 'lucide-react';

export default function LoginPage() {
  const { login, signUp, enterSandbox } = useRole();
  
  // Tabs: 'signin' | 'signup'
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  
  // Auth Form Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role>('Fleet Manager');
  
  // UI States
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 2FA Verification Flow State
  const [showTwoStep, setShowTwoStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [pendingAction, setPendingAction] = useState<() => Promise<void>>(() => async () => {});

  // Form Validation Checks
  const isEmailValid = (e: string) => /\S+@\S+\.\S+/.test(e);
  const isPasswordStrong = password.length >= 6;
  const doPasswordsMatch = password === confirmPassword;

  // Handle Tab Switch
  const handleTabChange = (tab: 'signin' | 'signup') => {
    setActiveTab(tab);
    setErrorMsg('');
    setInfoMsg('');
    setPassword('');
    setConfirmPassword('');
  };

  // Submit Sign In Form
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!isEmailValid(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    // Trigger 2FA step verification modal
    setPendingAction(() => async () => {
      setIsSubmitting(true);
      try {
        const { error } = await login(email, password);
        if (error) {
          setErrorMsg(error.message || 'Login failed. Please check your credentials.');
          setShowTwoStep(false);
        }
      } catch (err) {
        setErrorMsg('An unexpected error occurred.');
        setShowTwoStep(false);
      } finally {
        setIsSubmitting(false);
      }
    });

    setShowTwoStep(true);
  };

  // Submit Sign Up Form
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!fullName.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }
    if (!isEmailValid(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!isPasswordStrong) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (!doPasswordsMatch) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    // Trigger 2FA step verification modal
    setPendingAction(() => async () => {
      setIsSubmitting(true);
      try {
        const { data, error } = await signUp(email, password, fullName, selectedRole);
        if (error) {
          setErrorMsg(error.message || 'Registration failed.');
          setShowTwoStep(false);
        } else {
          setInfoMsg('Account created successfully! Check your email to verify your link, or sign in now.');
          setActiveTab('signin');
          setShowTwoStep(false);
          setPassword('');
          setConfirmPassword('');
        }
      } catch (err) {
        setErrorMsg('An unexpected error occurred.');
        setShowTwoStep(false);
      } finally {
        setIsSubmitting(false);
      }
    });

    setShowTwoStep(true);
  };

  // Verify OTP Code
  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');

    // In demo stage, check code 123456 or allow bypassing
    if (otpCode !== '123456' && otpCode !== '') {
      setOtpError('Invalid verification code. Enter "123456" for demo mode bypass.');
      return;
    }

    await pendingAction();
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#060814] via-[#0B0F19] to-[#121630] flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Abstract Background Highlights */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -z-10 animate-pulse duration-[6000ms]"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -z-10 animate-pulse duration-[8000ms]"></div>

      {/* Header Logo */}
      <div className="mb-8 text-center">
        <div className="p-3 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl shadow-xl shadow-blue-500/20 w-fit mx-auto mb-4 border border-blue-400/20">
          <Truck className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
          TransitOps
        </h1>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">
          Smart Transport Operations Platform
        </p>
      </div>

      {/* Auth Card wrapper */}
      <div className="w-full max-w-md bg-[#0F1424]/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl shadow-2xl p-8 relative">
        
        {/* Two-Step Verification Form */}
        {showTwoStep ? (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center">
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl w-fit mx-auto mb-3">
                <KeyRound className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-200">Two-Step Verification</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                A verification passcode has been sent to <span className="text-blue-400 font-semibold">{email}</span>.
              </p>
              <p className="text-[10px] text-amber-400 mt-1 bg-amber-500/10 border border-amber-500/20 py-1 px-2 rounded-lg inline-block font-semibold">
                Demo Bypass Code: <span className="font-mono">123456</span> or leave blank
              </p>
            </div>

            <form onSubmit={handleOtpVerify} className="space-y-4">
              {otpError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{otpError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Enter OTP Code</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="------"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-[#161B30] border border-slate-800 focus:border-slate-700 rounded-xl px-4 py-3 text-center text-lg font-mono text-slate-200 focus:outline-none transition-all placeholder-slate-700"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTwoStep(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-4.5 w-4.5 border-t-2 border-b-2 border-white"></div>
                  ) : (
                    <>Verify & Continue <ArrowRight className="h-4 w-4" /></>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Normal Auth Tab Mode */
          <div className="space-y-6">
            {/* Tabs Selector */}
            <div className="flex bg-[#161B30] p-1.5 rounded-2xl border border-slate-800">
              <button
                onClick={() => handleTabChange('signin')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeTab === 'signin' 
                    ? 'bg-[#0F1424] text-blue-400 border border-slate-800 shadow-md shadow-black/10' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => handleTabChange('signup')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeTab === 'signup' 
                    ? 'bg-[#0F1424] text-blue-400 border border-slate-800 shadow-md shadow-black/10' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Register
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {infoMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{infoMsg}</span>
              </div>
            )}

            {activeTab === 'signin' ? (
              /* Sign In Form */
              <form onSubmit={handleSignInSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      placeholder="manager@transitops.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#161B30] border border-slate-800 focus:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#161B30] border border-slate-800 focus:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer mt-6"
                >
                  Sign In <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            ) : (
              /* Sign Up / Register Form */
              <form onSubmit={handleSignUpSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="Aman Mahadik"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-[#161B30] border border-slate-800 focus:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      placeholder="admin@transitops.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#161B30] border border-slate-800 focus:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Role Assignment Selector */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Assigned Account Role</label>
                  <div className="relative">
                    <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as Role)}
                      className="w-full bg-[#161B30] border border-slate-800 focus:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-300 focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="Fleet Manager">Fleet Manager (Full Admin)</option>
                      <option value="Dispatcher">Dispatcher (Manage Trips)</option>
                      <option value="Safety Officer">Safety Officer (License Safety)</option>
                      <option value="Financial Analyst">Financial Analyst (Expenses & Reports)</option>
                      <option value="Driver">Driver (Viewer Mode)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        type="password"
                        required
                        placeholder="Min 6 chars"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`w-full bg-[#161B30] border rounded-xl pl-9 pr-2 py-2.5 text-xs text-slate-200 focus:outline-none transition-all ${
                          password ? (isPasswordStrong ? 'border-emerald-500/50' : 'border-red-500/50') : 'border-slate-800'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Confirm</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        type="password"
                        required
                        placeholder="Match pass"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`w-full bg-[#161B30] border rounded-xl pl-9 pr-2 py-2.5 text-xs text-slate-200 focus:outline-none transition-all ${
                          confirmPassword ? (doPasswordsMatch ? 'border-emerald-500/50' : 'border-red-500/50') : 'border-slate-800'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Live password checks feedback */}
                {password && (
                  <div className="space-y-1 bg-slate-900/50 p-3 rounded-xl border border-slate-800/80">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      {isPasswordStrong ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <X className="h-3 w-3 text-red-400" />
                      )}
                      <span>Password length (at least 6 characters)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      {confirmPassword && doPasswordsMatch ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <X className="h-3 w-3 text-red-400" />
                      )}
                      <span>Passwords match check</span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer mt-6"
                >
                  Create Account <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}

            {/* Offline Sandbox bypass mode */}
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-800/60"></div>
              <span className="flex-shrink mx-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider">Or Demo Mode</span>
              <div className="flex-grow border-t border-slate-800/60"></div>
            </div>

            <div className="text-center">
              <button
                onClick={() => enterSandbox(selectedRole)}
                className="text-xs font-bold text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1.5 mx-auto cursor-pointer"
              >
                <CircleDot className="h-4 w-4 text-blue-400 animate-pulse" />
                Bypass & Enter in Sandbox Demo Mode
              </button>
              <span className="block text-[9px] text-slate-500 mt-1.5 leading-snug">
                Enters the platform fully local-first (stored in localStorage) without needing a Supabase network link.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
