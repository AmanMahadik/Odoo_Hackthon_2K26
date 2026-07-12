'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { useRole } from '@/lib/roleContext';
import { Vehicle, MaintenanceLog } from '@/lib/mockData';
import { 
  Plus, 
  Wrench, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  AlertTriangle,
  X
} from 'lucide-react';

export default function MaintenancePage() {
  const { canAccess } = useRole();
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [isOpen, setIsOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Close log state
  const [closeOpen, setCloseOpen] = useState(false);
  const [closingLogId, setClosingLogId] = useState('');
  const [finalCost, setFinalCost] = useState('');
  const [closeError, setCloseError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mLogs, vList] = await Promise.all([
        db.getMaintenanceLogs(),
        db.getVehicles()
      ]);
      setLogs(mLogs);
      // Filter out retired vehicles for new logs
      setVehicles(vList.filter(v => v.status !== 'Retired'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedVehicleId || !description || !estimatedCost) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    const vehicle = vehicles.find(v => v.id === selectedVehicleId);
    if (vehicle && vehicle.status === 'On Trip') {
      setErrorMsg(`Vehicle ${vehicle.registration_number} is currently On Trip and cannot be scheduled for shop check-in.`);
      return;
    }

    try {
      await db.createMaintenanceLog({
        vehicle_id: selectedVehicleId,
        description: description.trim(),
        cost: Number(estimatedCost),
        status: 'Open'
      });

      setSelectedVehicleId('');
      setDescription('');
      setEstimatedCost('');
      setIsOpen(false);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error logging maintenance.');
    }
  };

  const openCloseModal = (log: MaintenanceLog) => {
    setClosingLogId(log.id);
    setFinalCost(log.cost.toString());
    setCloseError('');
    setCloseOpen(true);
  };

  const handleCloseMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    setCloseError('');

    if (!finalCost) {
      setCloseError('Please enter final cost.');
      return;
    }

    try {
      await db.updateMaintenanceLog(closingLogId, {
        status: 'Closed',
        cost: Number(finalCost),
        closed_at: new Date().toISOString()
      });

      setCloseOpen(false);
      setClosingLogId('');
      fetchData();
    } catch (err: any) {
      setCloseError(err.message || 'Error closing log.');
    }
  };

  const getStatusBadge = (status: MaintenanceLog['status']) => {
    switch (status) {
      case 'Open':
        return (
          <span className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit">
            <Clock className="h-3.5 w-3.5" /> In Shop
          </span>
        );
      case 'Closed':
        return (
          <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit">
            <CheckCircle className="h-3.5 w-3.5" /> Serviced
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-100">Maintenance Records</h2>
          <p className="text-xs text-slate-400">Trigger vehicle status transitions and log fleet service events</p>
        </div>

        {canAccess('maintenance', 'create') && (
          <button
            onClick={() => setIsOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/10 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Log Service
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-[#0F1424]/40 border border-slate-850 p-12 text-center rounded-2xl">
          <Wrench className="h-10 w-10 text-slate-600 mx-auto mb-2" />
          <p className="text-xs text-slate-400 font-semibold">No maintenance logs found in registry.</p>
        </div>
      ) : (
        <div className="bg-[#0F1424]/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/50 border-b border-slate-850 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="p-4">Vehicle</th>
                  <th className="p-4">Service Description</th>
                  <th className="p-4">Total Cost</th>
                  <th className="p-4">Opened Date</th>
                  <th className="p-4">Closed Date</th>
                  <th className="p-4">State</th>
                  {canAccess('maintenance', 'create') && <th className="p-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="p-4 font-bold text-slate-200">
                      {log.vehicle ? log.vehicle.registration_number : 'Unknown'}
                      <span className="block text-[10px] text-slate-500 font-medium font-sans">
                        {log.vehicle ? log.vehicle.model : ''}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300 max-w-xs">{log.description}</td>
                    <td className="p-4 text-slate-300 font-semibold font-mono">
                      ${log.cost.toLocaleString()}
                    </td>
                    <td className="p-4 text-slate-400">
                      {new Date(log.opened_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-slate-400">
                      {log.closed_at ? new Date(log.closed_at).toLocaleDateString() : '--'}
                    </td>
                    <td className="p-4">{getStatusBadge(log.status)}</td>
                    {canAccess('maintenance', 'create') && (
                      <td className="p-4 text-right">
                        {log.status === 'Open' && (
                          <button
                            onClick={() => openCloseModal(log)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 ml-auto cursor-pointer"
                          >
                            <CheckCircle className="h-3.5 w-3.5" /> Close Log
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Open Log Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-[#06080F]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0F1424] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-850 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-slate-200 text-sm">Log Shop Check-in</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Locks vehicle status to In Shop on database</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleOpenMaintenance} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Vehicle</label>
                <select
                  required
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full bg-[#161B30] border border-slate-800 focus:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="">-- Choose Vehicle --</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.registration_number} - {v.model} (Odo: {v.odometer}km, Status: {v.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Repair/Service Description</label>
                <textarea
                  required
                  placeholder="Describe parts checked, diagnostics, or vibration repairs..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-[#161B30] border border-slate-800 focus:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Estimated Cost ($)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="number"
                    required
                    placeholder="e.g. 350"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(e.target.value)}
                    className="w-full bg-[#161B30] border border-slate-800 focus:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
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
                  Open Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Log Modal */}
      {closeOpen && (
        <div className="fixed inset-0 bg-[#06080F]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0F1424] border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-850 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-slate-200 text-sm">Close Service Log</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Releases vehicle and registers cost expense</p>
              </div>
              <button
                onClick={() => setCloseOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCloseMaintenance} className="p-6 space-y-4">
              {closeError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{closeError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Final Service Cost ($)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="number"
                    required
                    placeholder="e.g. 450"
                    value={finalCost}
                    onChange={(e) => setFinalCost(e.target.value)}
                    className="w-full bg-[#161B30] border border-slate-800 focus:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none font-bold"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3 border-t border-slate-850 mt-4">
                <button
                  type="button"
                  onClick={() => setCloseOpen(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-500/10 cursor-pointer"
                >
                  Complete Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
