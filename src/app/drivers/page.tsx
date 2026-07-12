'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/db';
import { useRole } from '@/lib/roleContext';
import { Driver } from '@/lib/mockData';
import { 
  Plus, 
  Search, 
  UserCheck, 
  AlertTriangle, 
  ShieldAlert, 
  Ban, 
  Check, 
  X,
  Calendar,
  Star
} from 'lucide-react';

function DriversContent() {
  const searchParams = useSearchParams();
  const { canAccess } = useRole();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Form State
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [licenseNum, setLicenseNum] = useState('');
  const [category, setCategory] = useState('Heavy Vehicle');
  const [expiry, setExpiry] = useState('');
  const [contact, setContact] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const data = await db.getDrivers();
      setDrivers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();

    if (searchParams.get('add') === 'true') {
      setIsOpen(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name || !licenseNum || !expiry || !contact) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    // License constraint check (unique)
    const exists = drivers.some(
      d => d.license_number.toLowerCase() === licenseNum.trim().toLowerCase()
    );
    if (exists) {
      setErrorMsg(`Driver with license number ${licenseNum} already exists.`);
      return;
    }

    try {
      await db.createDriver({
        name: name.trim(),
        license_number: licenseNum.trim().toUpperCase(),
        license_category: category,
        license_expiry_date: expiry,
        contact_number: contact.trim(),
        safety_score: 100, // default new safety score
        status: 'Available'
      });

      // Reset
      setName('');
      setLicenseNum('');
      setExpiry('');
      setContact('');
      setIsOpen(false);
      fetchDrivers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating driver.');
    }
  };

  const handleToggleSuspend = async (d: Driver) => {
    const isSuspended = d.status === 'Suspended';
    const action = isSuspended ? 'activate' : 'suspend';
    if (!confirm(`Are you sure you want to ${action} driver ${d.name}?`)) {
      return;
    }

    try {
      await db.updateDriver(d.id, {
        status: isSuspended ? 'Available' : 'Suspended'
      });
      fetchDrivers();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredDrivers = drivers.filter(d => {
    const matchesSearch = 
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.license_number.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Driver['status']) => {
    switch (status) {
      case 'Available':
        return <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold">Available</span>;
      case 'On Trip':
        return <span className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-xs font-semibold">On Trip</span>;
      case 'Off Duty':
        return <span className="px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-full text-xs font-semibold">Off Duty</span>;
      case 'Suspended':
        return <span className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full text-xs font-semibold">Suspended</span>;
    }
  };

  const getComplianceIndicator = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="flex items-center gap-1 text-red-400 font-bold">
          <ShieldAlert className="h-4 w-4 shrink-0 animate-pulse" /> Expired
        </span>
      );
    } else if (diffDays <= 30) {
      return (
        <span className="flex items-center gap-1 text-yellow-400 font-semibold">
          <AlertTriangle className="h-4 w-4 shrink-0" /> Expiry warning ({diffDays}d)
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-emerald-400 font-medium">
        <Check className="h-4 w-4 shrink-0" /> Valid
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-100">Driver Registry</h2>
          <p className="text-xs text-slate-400">Manage licensed personnel, safety scoring, and compliance statuses</p>
        </div>

        {canAccess('drivers', 'create') && (
          <button
            onClick={() => setIsOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/10 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Driver
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-[#0F1424]/90 border border-slate-800 p-4 rounded-2xl shadow-md">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by driver name or license number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#161B30] border border-slate-800 focus:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none transition-all"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#161B30] border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="Off Duty">Off Duty</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Grid Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredDrivers.length === 0 ? (
        <div className="bg-[#0F1424]/40 border border-slate-850 p-12 text-center rounded-2xl">
          <UserCheck className="h-10 w-10 text-slate-600 mx-auto mb-2" />
          <p className="text-xs text-slate-400 font-semibold">No drivers match search parameters.</p>
        </div>
      ) : (
        <div className="bg-[#0F1424]/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/50 border-b border-slate-850 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="p-4">Name</th>
                  <th className="p-4">License Number</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4 flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                    Safety Score
                  </th>
                  <th className="p-4">License Compliance</th>
                  <th className="p-4">Duty Status</th>
                  {canAccess('drivers', 'update') && <th className="p-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredDrivers.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="p-4 font-bold text-slate-200">{d.name}</td>
                    <td className="p-4 text-slate-300 font-mono uppercase">{d.license_number}</td>
                    <td className="p-4 text-slate-400">{d.license_category}</td>
                    <td className="p-4 text-slate-400">{d.contact_number}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-lg font-bold ${
                        d.safety_score >= 90 ? 'text-emerald-400 bg-emerald-500/10' :
                        d.safety_score >= 80 ? 'text-blue-400 bg-blue-500/10' :
                        'text-red-400 bg-red-500/10'
                      }`}>
                        {d.safety_score} / 100
                      </span>
                    </td>
                    <td className="p-4">{getComplianceIndicator(d.license_expiry_date)}</td>
                    <td className="p-4">{getStatusBadge(d.status)}</td>
                    {canAccess('drivers', 'update') && (
                      <td className="p-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleToggleSuspend(d)}
                            title={d.status === 'Suspended' ? 'Unsuspend Driver' : 'Suspend Driver'}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              d.status === 'Suspended'
                                ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                            }`}
                          >
                            {d.status === 'Suspended' ? <Check className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Driver Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-[#06080F]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0F1424] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-850 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-slate-200 text-sm">Register New Operator</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Enforces unique license check</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mike Ross"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#161B30] border border-slate-800 focus:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">License Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DL-2023-003"
                    value={licenseNum}
                    onChange={(e) => setLicenseNum(e.target.value)}
                    className="w-full bg-[#161B30] border border-slate-800 focus:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">License Type</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#161B30] border border-slate-800 focus:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="Heavy Vehicle">Heavy Vehicle</option>
                    <option value="Light Vehicle">Light Vehicle</option>
                    <option value="Motorcycle">Motorcycle</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">License Expiry Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    className="w-full bg-[#161B30] border border-slate-800 focus:border-slate-700 rounded-xl pl-10 pr-3 py-2 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Contact Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +1-555-0103"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="w-full bg-[#161B30] border border-slate-800 focus:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div className="pt-4 flex gap-3 border-t border-slate-850 mt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/10 cursor-pointer"
                >
                  Register Operator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DriversPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    }>
      <DriversContent />
    </Suspense>
  );
}

