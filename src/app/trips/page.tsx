'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/db';
import { useRole } from '@/lib/roleContext';
import { Vehicle, Driver, Trip } from '@/lib/mockData';
import { 
  Plus, 
  Play, 
  CheckCircle2, 
  XCircle, 
  MapPin, 
  Scale, 
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  X
} from 'lucide-react';

function TripsContent() {
  const searchParams = useSearchParams();
  const { canAccess } = useRole();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Plan Trip Form State
  const [isOpen, setIsOpen] = useState(false);
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [cargoWeight, setCargoWeight] = useState('');
  const [distance, setDistance] = useState('');
  const [formStatus, setFormStatus] = useState<'Draft' | 'Dispatched'>('Draft');
  const [errorMsg, setErrorMsg] = useState('');

  // Modal Complete Trip Form State
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completingTripId, setCompletingTripId] = useState('');
  const [actualDist, setActualDist] = useState('');
  const [fuelConsumed, setFuelConsumed] = useState('');
  const [fuelCost, setFuelCost] = useState('');
  const [completeError, setCompleteError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tList, vList, dList] = await Promise.all([
        db.getTrips(),
        db.getVehicles(),
        db.getDrivers()
      ]);
      setTrips(tList);
      setVehicles(vList);
      setDrivers(dList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    if (searchParams.get('new') === 'true') {
      setIsOpen(true);
    }
  }, [searchParams]);

  // Filter Available entities
  const availableVehicles = vehicles.filter(v => v.status === 'Available');
  const availableDrivers = drivers.filter(d => {
    const isAvail = d.status === 'Available';
    const isLicenseValid = new Date(d.license_expiry_date) > new Date();
    return isAvail && isLicenseValid;
  });

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!source || !destination || !selectedVehicleId || !selectedDriverId || !cargoWeight || !distance) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    const vehicle = vehicles.find(v => v.id === selectedVehicleId);
    if (vehicle && Number(cargoWeight) > vehicle.max_load_capacity) {
      setErrorMsg(`Cargo weight (${cargoWeight}kg) exceeds selected vehicle maximum load capacity (${vehicle.max_load_capacity}kg).`);
      return;
    }

    try {
      await db.createTrip({
        source: source.trim(),
        destination: destination.trim(),
        vehicle_id: selectedVehicleId,
        driver_id: selectedDriverId,
        cargo_weight: Number(cargoWeight),
        planned_distance: Number(distance),
        status: formStatus
      });

      // Clear
      setSource('');
      setDestination('');
      setSelectedVehicleId('');
      setSelectedDriverId('');
      setCargoWeight('');
      setDistance('');
      setFormStatus('Draft');
      setIsOpen(false);
      
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing trip dispatch.');
    }
  };

  const handleDispatchDraft = async (t: Trip) => {
    const vehicle = vehicles.find(v => v.id === t.vehicle_id);
    const driver = drivers.find(d => d.id === t.driver_id);

    if (vehicle?.status !== 'Available') {
      alert(`Cannot dispatch: Vehicle ${vehicle?.registration_number} is currently ${vehicle?.status}.`);
      return;
    }
    if (driver?.status !== 'Available') {
      alert(`Cannot dispatch: Driver ${driver?.name} is currently ${driver?.status}.`);
      return;
    }
    if (driver && new Date(driver.license_expiry_date) < new Date()) {
      alert(`Cannot dispatch: Driver ${driver?.name} license has expired.`);
      return;
    }

    try {
      await db.updateTrip(t.id, { status: 'Dispatched' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const openCompleteModal = (t: Trip) => {
    setCompletingTripId(t.id);
    setActualDist(t.planned_distance.toString());
    
    // Auto fill rough estimates for fuel logs helper
    const estimatedFuel = Math.round(t.planned_distance * 0.15); // 15L/100km avg
    setFuelConsumed(estimatedFuel.toString());
    setFuelCost((estimatedFuel * 2.15).toFixed(2)); // mock cost per liter
    setCompleteError('');
    setCompleteOpen(true);
  };

  const handleCompleteTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompleteError('');

    if (!actualDist || !fuelConsumed || !fuelCost) {
      setCompleteError('Please input completion metrics.');
      return;
    }

    try {
      const trip = trips.find(x => x.id === completingTripId);
      if (!trip) return;

      // Update odometer reading on vehicle
      const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
      const newOdometer = (vehicle?.odometer || 0) + Number(actualDist);

      // Perform updates
      await db.updateTrip(completingTripId, {
        status: 'Completed',
        actual_distance: Number(actualDist)
      });

      await db.updateVehicle(trip.vehicle_id, {
        odometer: newOdometer
      });

      // Create fuel log entry
      await db.createFuelLog({
        vehicle_id: trip.vehicle_id,
        trip_id: completingTripId,
        liters: Number(fuelConsumed),
        cost: Number(fuelCost),
        log_date: new Date().toISOString().split('T')[0]
      });

      setCompleteOpen(false);
      setCompletingTripId('');
      fetchData();
    } catch (err: any) {
      setCompleteError(err.message || 'Error completing trip.');
    }
  };

  const handleCancelTrip = async (t: Trip) => {
    if (!confirm('Are you sure you want to cancel this dispatched trip? Vehicle and driver will be returned to Available pool.')) {
      return;
    }
    try {
      await db.updateTrip(t.id, { status: 'Cancelled' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Divide into board columns
  const getTripsByStatus = (status: Trip['status']) => {
    return trips.filter(t => t.status === status);
  };

  const statusLanes: Trip['status'][] = ['Draft', 'Dispatched', 'Completed', 'Cancelled'];

  const getLaneStyle = (status: Trip['status']) => {
    switch (status) {
      case 'Draft': return 'border-slate-800 bg-[#0F1424]/40';
      case 'Dispatched': return 'border-blue-800/40 bg-blue-900/5';
      case 'Completed': return 'border-emerald-800/40 bg-emerald-950/5';
      case 'Cancelled': return 'border-red-900/20 bg-red-950/5';
    }
  };

  const getLaneHeader = (status: Trip['status']) => {
    switch (status) {
      case 'Draft': return <span className="text-slate-400 font-bold uppercase">Draft Routes</span>;
      case 'Dispatched': return <span className="text-blue-400 font-bold uppercase animate-pulse">In Transit / Dispatched</span>;
      case 'Completed': return <span className="text-emerald-400 font-bold uppercase">Completed Deliveries</span>;
      case 'Cancelled': return <span className="text-red-400 font-bold uppercase">Cancelled</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-100">Trip Dispatch Board</h2>
          <p className="text-xs text-slate-400">Enforces driver availability and cargo capacity locks atomically</p>
        </div>

        {canAccess('trips', 'create') && (
          <button
            onClick={() => setIsOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/10 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Create Trip
          </button>
        )}
      </div>

      {/* Board Layout */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          {statusLanes.map(status => {
            const laneTrips = getTripsByStatus(status);
            return (
              <div 
                key={status} 
                className={`border p-4 rounded-2xl flex flex-col gap-4 min-h-[500px] shadow-sm transition-all duration-300 ${getLaneStyle(status)}`}
              >
                {/* Lane Header */}
                <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                  <div className="text-xs flex items-center gap-2">
                    {getLaneHeader(status)}
                  </div>
                  <span className="text-[10px] bg-slate-800/60 font-bold px-2 py-0.5 rounded-full text-slate-300">
                    {laneTrips.length}
                  </span>
                </div>

                {/* Lane cards */}
                <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1">
                  {laneTrips.length === 0 ? (
                    <div className="text-center py-8 text-[11px] text-slate-500">
                      Empty Lane
                    </div>
                  ) : (
                    laneTrips.map(t => (
                      <div 
                        key={t.id} 
                        className="p-4 bg-[#141A30] border border-slate-800 hover:border-slate-700/80 rounded-xl space-y-3 transition-all duration-200 shadow-lg"
                      >
                        {/* Source/Dest */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                            <MapPin className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                            <span>{t.source}</span>
                          </div>
                          <div className="pl-5 text-[10px] text-slate-500">to</div>
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                            <MapPin className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                            <span>{t.destination}</span>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="border-t border-slate-800/80 pt-2.5 grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                          <div>
                            <span className="block text-slate-500 font-medium">VEHICLE</span>
                            <span className="font-semibold text-slate-300">
                              {t.vehicle ? t.vehicle.registration_number : 'Unknown'}
                            </span>
                          </div>
                          <div>
                            <span className="block text-slate-500 font-medium">DRIVER</span>
                            <span className="font-semibold text-slate-300">
                              {t.driver ? t.driver.name : 'Unknown'}
                            </span>
                          </div>
                          <div className="mt-1">
                            <span className="block text-slate-500 font-medium">DISTANCE</span>
                            <span className="font-semibold text-slate-300">{t.planned_distance} km</span>
                          </div>
                          <div className="mt-1">
                            <span className="block text-slate-500 font-medium">CARGO</span>
                            <span className="font-semibold text-slate-300">{t.cargo_weight} kg</span>
                          </div>
                        </div>

                        {/* Actions */}
                        {canAccess('trips', 'dispatch') && (
                          <div className="pt-2 border-t border-slate-800/60 flex gap-2">
                            {t.status === 'Draft' && (
                              <button
                                onClick={() => handleDispatchDraft(t)}
                                className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Play className="h-3 w-3" /> Dispatch Route
                              </button>
                            )}
                            
                            {t.status === 'Dispatched' && (
                              <>
                                <button
                                  onClick={() => openCompleteModal(t)}
                                  className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <CheckCircle2 className="h-3 w-3" /> Complete
                                </button>
                                <button
                                  onClick={() => handleCancelTrip(t)}
                                  className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors cursor-pointer"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Plan / Create Trip Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-[#06080F]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0F1424] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-850 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-slate-200 text-sm">Plan Transport Route</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Filters out unavailable vehicles & drivers</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTrip} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Source Depot</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Warehouse A"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full bg-[#161B30] border border-slate-800 focus:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Destination</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Port Terminal 3"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full bg-[#161B30] border border-slate-800 focus:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Available Vehicle</label>
                <select
                  required
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full bg-[#161B30] border border-slate-800 focus:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="">-- Choose Vehicle --</option>
                  {availableVehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.registration_number} - {v.model} (Max Load: {v.max_load_capacity}kg)
                    </option>
                  ))}
                </select>
                {availableVehicles.length === 0 && (
                  <span className="text-[10px] text-red-400 mt-1 block">Warning: No Available vehicles in registry.</span>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Available Driver</label>
                <select
                  required
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full bg-[#161B30] border border-slate-800 focus:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="">-- Choose Operator --</option>
                  {availableDrivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} - Score: {d.safety_score} (Lic: {d.license_category})
                    </option>
                  ))}
                </select>
                {availableDrivers.length === 0 && (
                  <span className="text-[10px] text-red-400 mt-1 block">Warning: No Available drivers in registry.</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Cargo Weight (kg)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 500"
                    value={cargoWeight}
                    onChange={(e) => setCargoWeight(e.target.value)}
                    className="w-full bg-[#161B30] border border-slate-800 focus:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Route Distance (km)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 150"
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                    className="w-full bg-[#161B30] border border-slate-800 focus:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Dispatch State</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="formStatus"
                      checked={formStatus === 'Draft'}
                      onChange={() => setFormStatus('Draft')}
                      className="accent-blue-500"
                    />
                    Save as Draft
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="formStatus"
                      checked={formStatus === 'Dispatched'}
                      onChange={() => setFormStatus('Dispatched')}
                      className="accent-blue-500"
                    />
                    Dispatch Instantly
                  </label>
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
                  Create Route
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Trip Modal */}
      {completeOpen && (
        <div className="fixed inset-0 bg-[#06080F]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0F1424] border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-850 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-slate-200 text-sm">Log Trip Completion</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Captures final metrics and updates logs</p>
              </div>
              <button
                onClick={() => setCompleteOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteTrip} className="p-6 space-y-4">
              {completeError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{completeError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Actual Distance Covered (km)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 125"
                  value={actualDist}
                  onChange={(e) => setActualDist(e.target.value)}
                  className="w-full bg-[#161B30] border border-slate-800 focus:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Fuel Consumed (Liters)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 45"
                    value={fuelConsumed}
                    onChange={(e) => setFuelConsumed(e.target.value)}
                    className="w-full bg-[#161B30] border border-slate-800 focus:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Fuel Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 96.75"
                    value={fuelCost}
                    onChange={(e) => setFuelCost(e.target.value)}
                    className="w-full bg-[#161B30] border border-slate-800 focus:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3 border-t border-slate-850 mt-4">
                <button
                  type="button"
                  onClick={() => setCompleteOpen(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-500/10 cursor-pointer"
                >
                  Log Completion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TripsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    }>
      <TripsContent />
    </Suspense>
  );
}

