'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/db';
import { useRole } from '@/lib/roleContext';
import { Vehicle } from '@/lib/mockData';
import { 
  Plus, 
  Search, 
  Filter, 
  Truck, 
  Edit3, 
  Trash2, 
  AlertCircle,
  FileText,
  X
} from 'lucide-react';

function VehiclesContent() {
  const searchParams = useSearchParams();
  const { canAccess } = useRole();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState('none');
  
  // Form modal state
  const [isOpen, setIsOpen] = useState(false);
  const [regNum, setRegNum] = useState('');
  const [model, setModel] = useState('');
  const [type, setType] = useState<'Van' | 'Truck' | 'Bike' | 'Car' | 'Bus'>('Van');
  const [capacity, setCapacity] = useState('');
  const [odometer, setOdometer] = useState('');
  const [cost, setCost] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Document Vault State
  const [docsOpen, setDocsOpen] = useState(false);
  const [docVehicle, setDocVehicle] = useState<Vehicle | null>(null);
  const [vehicleDocs, setVehicleDocs] = useState<{ name: string; size: string; date: string }[]>([
    { name: 'RC_Registration_Certificate.pdf', size: '2.4 MB', date: '2026-07-01' },
    { name: 'Commercial_Fleet_Insurance.pdf', size: '4.1 MB', date: '2026-07-02' },
    { name: 'Emission_Compliance_PUC.pdf', size: '1.2 MB', date: '2026-07-03' }
  ]);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const openDocsModal = (v: Vehicle) => {
    setDocVehicle(v);
    setDocsOpen(true);
  };

  const handleMockUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadingDoc(true);
      setTimeout(() => {
        setVehicleDocs(prev => [
          ...prev,
          { 
            name: file.name, 
            size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`, 
            date: new Date().toISOString().split('T')[0] 
          }
        ]);
        setUploadingDoc(false);
      }, 1000);
    }
  };

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const data = await db.getVehicles();
      setVehicles(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
    
    // Automatically open dialog if query parameter ?add=true is present
    if (searchParams.get('add') === 'true') {
      setIsOpen(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!regNum || !model || !capacity || !odometer || !cost) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    // Reg number constraint check (unique)
    const exists = vehicles.some(
      v => v.registration_number.toLowerCase() === regNum.trim().toLowerCase()
    );
    if (exists) {
      setErrorMsg(`Vehicle with registration number ${regNum} already exists.`);
      return;
    }

    try {
      await db.createVehicle({
        registration_number: regNum.trim().toUpperCase(),
        model: model.trim(),
        type,
        max_load_capacity: Number(capacity),
        odometer: Number(odometer),
        acquisition_cost: Number(cost),
        status: 'Available'
      });
      
      // Reset form
      setRegNum('');
      setModel('');
      setCapacity('');
      setOdometer('');
      setCost('');
      setIsOpen(false);
      
      // Refresh list
      fetchVehicles();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating vehicle.');
    }
  };

  const handleRetire = async (id: string) => {
    if (!confirm('Are you sure you want to retire this vehicle? This will remove it from active dispatches.')) {
      return;
    }
    try {
      await db.updateVehicle(id, { status: 'Retired' });
      fetchVehicles();
    } catch (err) {
      console.error(err);
    }
  };

  // Filter logic
  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = 
      v.registration_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.model.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || v.status === statusFilter;
    const matchesType = typeFilter === 'All' || v.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Sorting logic
  const sortedVehicles = [...filteredVehicles].sort((a, b) => {
    if (sortOrder === 'odo-asc') return a.odometer - b.odometer;
    if (sortOrder === 'odo-desc') return b.odometer - a.odometer;
    if (sortOrder === 'capacity-desc') return b.max_load_capacity - a.max_load_capacity;
    return 0;
  });

  const getStatusBadge = (status: Vehicle['status']) => {
    switch (status) {
      case 'Available':
        return <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold">Available</span>;
      case 'On Trip':
        return <span className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-xs font-semibold">On Trip</span>;
      case 'In Shop':
        return <span className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full text-xs font-semibold">In Shop</span>;
      case 'Retired':
        return <span className="px-2.5 py-1 bg-slate-500/10 border border-slate-500/20 text-slate-400 rounded-full text-xs font-semibold">Retired</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-100">Vehicle Registry</h2>
          <p className="text-xs text-slate-400">Master database of all logistics transport units</p>
        </div>
        
        {canAccess('vehicles', 'create') && (
          <button
            onClick={() => setIsOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/10 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Vehicle
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-[#0F1424]/90 border border-slate-800 p-4 rounded-2xl shadow-md">
        {/* Search */}
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by plate number or model name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#161B30] border border-slate-800 focus:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none transition-all"
          />
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#161B30] border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value="All">All Types</option>
            <option value="Van">Van</option>
            <option value="Truck">Truck</option>
            <option value="Bike">Bike</option>
            <option value="Car">Car</option>
            <option value="Bus">Bus</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#161B30] border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="In Shop">In Shop</option>
            <option value="Retired">Retired</option>
          </select>
        </div>

        {/* Sorting Option */}
        <div className="flex items-center gap-2">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="bg-[#161B30] border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value="none">No Sort</option>
            <option value="odo-asc">Odometer (Low to High)</option>
            <option value="odo-desc">Odometer (High to Low)</option>
            <option value="capacity-desc">Cargo Capacity (High to Low)</option>
          </select>
        </div>
      </div>

      {/* Table Data */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : sortedVehicles.length === 0 ? (
        <div className="bg-[#0F1424]/40 border border-slate-850 p-12 text-center rounded-2xl">
          <Truck className="h-10 w-10 text-slate-600 mx-auto mb-2" />
          <p className="text-xs text-slate-400 font-semibold">No vehicles match the filters.</p>
        </div>
      ) : (
        <div className="bg-[#0F1424]/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/50 border-b border-slate-850 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="p-4">Reg Number</th>
                  <th className="p-4">Model Details</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Odometer</th>
                  <th className="p-4">Max Capacity</th>
                  <th className="p-4">Cost</th>
                  <th className="p-4">Status</th>
                  {canAccess('vehicles', 'update') && <th className="p-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {sortedVehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="p-4 font-bold text-slate-200">{v.registration_number}</td>
                    <td className="p-4 text-slate-300">{v.model}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 bg-slate-800 rounded-lg text-slate-400 font-medium">
                        {v.type}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 font-semibold">{v.odometer.toLocaleString()} km</td>
                    <td className="p-4 text-slate-400 font-semibold">{v.max_load_capacity.toLocaleString()} kg</td>
                    <td className="p-4 text-slate-400 font-semibold">${v.acquisition_cost.toLocaleString()}</td>
                    <td className="p-4">{getStatusBadge(v.status)}</td>
                    {canAccess('vehicles', 'update') && (
                      <td className="p-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => openDocsModal(v)}
                            title="Manage Vehicle Documents"
                            className="p-1.5 hover:bg-blue-500/10 text-blue-400 rounded-lg transition-colors cursor-pointer"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                          {v.status !== 'Retired' && (
                            <button
                              onClick={() => handleRetire(v.id)}
                              title="Retire vehicle"
                              className="p-1.5 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
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

      {/* Add Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 bg-[#06080F]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0F1424] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-850 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-slate-200 text-sm">Register New Vehicle</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Enforces unique registration constraint</p>
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
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Registration #</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. VAN-05"
                    value={regNum}
                    onChange={(e) => setRegNum(e.target.value)}
                    className="w-full bg-[#161B30] border border-slate-800 focus:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Vehicle Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full bg-[#161B30] border border-slate-800 focus:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="Van">Van</option>
                    <option value="Truck">Truck</option>
                    <option value="Bike">Bike</option>
                    <option value="Car">Car</option>
                    <option value="Bus">Bus</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Model Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ford Transit 2022"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-[#161B30] border border-slate-800 focus:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Max Load (kg)</label>
                  <input
                    type="number"
                    required
                    placeholder="1200"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full bg-[#161B30] border border-slate-800 focus:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Odometer (km)</label>
                  <input
                    type="number"
                    required
                    placeholder="12500"
                    value={odometer}
                    onChange={(e) => setOdometer(e.target.value)}
                    className="w-full bg-[#161B30] border border-slate-800 focus:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Acq. Cost ($)</label>
                  <input
                    type="number"
                    required
                    placeholder="35000"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="w-full bg-[#161B30] border border-slate-800 focus:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
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
                  Register Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Document Vault Modal */}
      {docsOpen && docVehicle && (
        <div className="fixed inset-0 bg-[#06080F]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0F1424] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-850 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-slate-200 text-sm">Document Vault: {docVehicle.registration_number}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Registration, Insurance & Permits scans</p>
              </div>
              <button 
                onClick={() => setDocsOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Document List */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {vehicleDocs.map((doc, idx) => (
                  <div key={idx} className="p-3 bg-[#161B30] border border-slate-800 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block truncate max-w-[200px]">{doc.name}</span>
                      <span className="text-[10px] text-slate-500">{doc.size} • Uploaded: {doc.date}</span>
                    </div>
                    <a 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); alert(`Simulated download of file: ${doc.name}`); }}
                      className="text-[10px] text-blue-400 font-bold hover:underline"
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>

              {/* Upload Input */}
              <div className="border-t border-slate-850 pt-4 space-y-3">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Upload Document</label>
                <div className="relative border border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-6 text-center cursor-pointer hover:bg-slate-800/10 transition-all">
                  <input
                    type="file"
                    onChange={handleMockUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="text-xs text-slate-400 space-y-1">
                    <span className="block font-semibold text-blue-400">Click to upload file</span>
                    <span className="block text-[10px] text-slate-500">PDF, PNG, JPG (Max 5MB)</span>
                  </div>
                </div>
                {uploadingDoc && (
                  <div className="flex items-center gap-2 justify-center text-xs text-blue-400">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
                    <span>Uploading scan to Supabase Document Vault...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VehiclesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    }>
      <VehiclesContent />
    </Suspense>
  );
}

