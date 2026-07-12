'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { useRole } from '@/lib/roleContext';
import { Vehicle, Driver, Trip, MaintenanceLog } from '@/lib/mockData';
import { 
  TrendingUp, 
  Truck, 
  Users, 
  Wrench, 
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Calendar,
  Layers,
  Database,
  DollarSign,
  PlusCircle,
  FileText,
  Activity
} from 'lucide-react';

export default function Dashboard() {
  const { role, canAccess, theme } = useRole();
  const [dbMode, setDbMode] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Live map simulation stats
  const [simProgress, setSimProgress] = useState(35);

  useEffect(() => {
    async function fetchData() {
      try {
        const [v, d, t, m] = await Promise.all([
          db.getVehicles(),
          db.getDrivers(),
          db.getTrips(),
          db.getMaintenanceLogs()
        ]);
        setVehicles(v);
        setDrivers(d);
        setTrips(t);
        setMaintenance(m);
        setDbMode(db.getMode());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();

    // Map progress simulation
    const interval = setInterval(() => {
      setSimProgress((prev) => (prev >= 100 ? 0 : prev + 1));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Theme Styling Helpers
  const cardBgClass = theme === 'light' 
    ? 'bg-white border-slate-200 shadow-sm text-slate-800' 
    : 'bg-[#0F1424]/90 border-slate-800 text-slate-200';
  const textPrimary = theme === 'light' ? 'text-slate-900' : 'text-white';
  const textSecondary = theme === 'light' ? 'text-slate-500' : 'text-slate-400';
  const mapBgClass = theme === 'light' ? 'bg-slate-100 border-slate-250 text-slate-800' : 'bg-[#080B13] border-slate-800 text-slate-200';
  const innerCardBgClass = theme === 'light' ? 'bg-slate-100 text-slate-800' : 'bg-slate-800/40 text-slate-200';
  const listBorderClass = theme === 'light' ? 'border-slate-100' : 'border-slate-850';

  // Calculate operational stats
  const totalVehicles = vehicles.filter(v => v.status !== 'Retired').length;
  const activeVehiclesOnTrip = vehicles.filter(v => v.status === 'On Trip').length;
  const utilizationRate = totalVehicles > 0 ? Math.round((activeVehiclesOnTrip / totalVehicles) * 100) : 0;
  
  const totalDrivers = drivers.length;
  const activeDriversOnTrip = drivers.filter(d => d.status === 'On Trip').length;
  
  const activeTrips = trips.filter(t => t.status === 'Dispatched').length;
  const openMaintenanceCount = maintenance.filter(m => m.status === 'Open').length;

  // Active On-Trip details for map simulation
  const currentTransitTrip = trips.find(t => t.status === 'Dispatched') || trips.find(t => t.status === 'Completed');

  // Safety Officer stats
  const expiringLicenses = drivers.filter(d => {
    const expiry = new Date(d.license_expiry_date);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  });
  const avgSafetyScore = drivers.length > 0 
    ? Math.round(drivers.reduce((acc, curr) => acc + Number(curr.safety_score), 0) / drivers.length)
    : 100;
  const suspendedDriversCount = drivers.filter(d => d.status === 'Suspended').length;

  // Fleet Manager: Vehicles in shop
  const inShopVehicles = vehicles.filter(v => v.status === 'In Shop');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Database Connection Banner */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-2xl gap-4 backdrop-blur-sm ${
        theme === 'light' ? 'bg-slate-200/50 border-slate-300' : 'bg-slate-900/50 border-slate-800'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${dbMode.includes('Live') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
            <Database className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Connection State</span>
            <span className={`text-sm font-bold ${textPrimary}`}>{dbMode}</span>
          </div>
        </div>
        <div className="text-xs text-slate-400 font-medium">
          Source SQL setup: <Link href="/supabase_schema.sql" className="text-blue-500 hover:underline font-semibold">supabase_schema.sql</Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. FLEET MANAGER DASHBOARD VIEW */}
      {/* ========================================================================= */}
      {role === 'Fleet Manager' && (
        <>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Utilization */}
            <div className={`border p-6 rounded-2xl flex items-center justify-between group transition-all duration-300 ${cardBgClass}`}>
              <div className="space-y-2">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Fleet Utilization</span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-extrabold ${textPrimary}`}>{utilizationRate}%</span>
                  <span className="text-xs text-slate-400 font-medium">of active fleet</span>
                </div>
                <div className="w-36 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${utilizationRate}%` }}
                  ></div>
                </div>
              </div>
              <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-500 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>

            {/* Vehicles */}
            <div className={`border p-6 rounded-2xl flex items-center justify-between group transition-all duration-300 ${cardBgClass}`}>
              <div className="space-y-2">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Active Fleet Size</span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-extrabold ${textPrimary}`}>{totalVehicles}</span>
                  <span className="text-xs text-slate-400 font-medium">{activeVehiclesOnTrip} dispatched</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">Excludes retired units</p>
              </div>
              <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-500 group-hover:scale-110 transition-transform">
                <Truck className="h-6 w-6" />
              </div>
            </div>

            {/* Drivers */}
            <div className={`border p-6 rounded-2xl flex items-center justify-between group transition-all duration-300 ${cardBgClass}`}>
              <div className="space-y-2">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Drivers On Duty</span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-extrabold ${textPrimary}`}>{totalDrivers}</span>
                  <span className="text-xs text-slate-400 font-medium">{activeDriversOnTrip} on trip</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">Available registry capacity</p>
              </div>
              <div className="p-4 bg-violet-500/10 rounded-2xl text-violet-500 group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6" />
              </div>
            </div>

            {/* Maintenance */}
            <div className={`border p-6 rounded-2xl flex items-center justify-between group transition-all duration-300 ${cardBgClass}`}>
              <div className="space-y-2">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Open Repairs</span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-extrabold ${textPrimary}`}>{openMaintenanceCount}</span>
                  <span className="text-xs text-slate-400 font-medium">pending shop</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">Requires technician check</p>
              </div>
              <div className={`p-4 rounded-2xl group-hover:scale-110 transition-transform ${openMaintenanceCount > 0 ? 'bg-red-500/10 text-red-500 animate-pulse' : 'bg-emerald-500/10 text-emerald-500'}`}>
                <Wrench className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Telematics GPS Simulator & Workshop list */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className={`lg:col-span-2 border rounded-2xl p-6 shadow-xl flex flex-col justify-between ${cardBgClass}`}>
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-bold text-md">Live GPS Telematics</h3>
                    <p className="text-xs text-slate-400 font-medium">Real-time coordinates broadcast</p>
                  </div>
                  <span className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-full text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5 animate-pulse">
                    Active Sim Stream
                  </span>
                </div>

                {/* Custom Interactive Map Representation */}
                <div className={`relative h-64 w-full rounded-xl overflow-hidden flex flex-col items-center justify-center p-4 border ${mapBgClass}`}>
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-20"></div>
                  
                  {currentTransitTrip ? (
                    <div className="w-full relative flex flex-col justify-between h-full z-10 p-4">
                      <div className="flex justify-between text-xs font-bold border-b border-slate-500/10 pb-2">
                        <span>TRIP ID: TRP-2024-{currentTransitTrip.trip_number || '1002'}</span>
                        <span className="text-blue-500">CARGO: {currentTransitTrip.cargo_weight} KG</span>
                      </div>

                      <div className="relative flex items-center justify-between my-auto">
                        <div className="absolute left-10 right-10 h-0.5 bg-slate-300 dark:bg-slate-800 top-1/2 -translate-y-1/2 overflow-hidden">
                          <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${simProgress}%` }}></div>
                        </div>

                        <div className="flex flex-col items-center gap-1 z-10">
                          <div className="p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-full">
                            <MapPin className="h-5 w-5 text-slate-500" />
                          </div>
                          <span className="text-[10px] font-bold bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800">
                            {currentTransitTrip.source}
                          </span>
                        </div>

                        <div className="absolute z-20 flex flex-col items-center -translate-y-1/2 top-1/2" style={{ left: `calc(2.5rem + (100% - 7rem) * ${simProgress / 100})` }}>
                          <div className="p-1.5 bg-blue-500 border border-white rounded-full shadow-lg shadow-blue-500/50 animate-bounce">
                            <Truck className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-[9px] font-extrabold text-blue-500 uppercase tracking-widest mt-1 block">
                            {simProgress}% done
                          </span>
                        </div>

                        <div className="flex flex-col items-center gap-1 z-10">
                          <div className="p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-full">
                            <MapPin className="h-5 w-5 text-slate-500" />
                          </div>
                          <span className="text-[10px] font-bold bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800">
                            {currentTransitTrip.destination}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-[10px] bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 p-2.5 rounded-lg">
                        <div>
                          <span className="block font-bold">VEHICLE ASSIGNED:</span>
                          <span className="text-blue-500 font-semibold">{currentTransitTrip.vehicle?.registration_number || 'TRK-12'}</span>
                        </div>
                        <div>
                          <span className="block font-bold">DISPATCHED OPERATOR:</span>
                          <span className="text-blue-500 font-semibold">{currentTransitTrip.driver?.name || 'Sarah Chen'}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center z-10 space-y-2">
                      <Truck className="h-10 w-10 text-slate-400 mx-auto animate-pulse" />
                      <p className="text-xs font-semibold">No active dispatched trips in transit.</p>
                      <p className="text-[10px] text-slate-500">Go to the Trip Board and dispatch a draft trip to simulate live tracking.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex gap-4">
                <Link href="/trips" className="flex-grow py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold text-center transition-all flex items-center justify-center gap-2">
                  Go to Trip Board <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/reports" className="flex-grow py-3 px-4 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold text-center hover:bg-slate-300 dark:hover:bg-slate-750 transition-all border border-transparent dark:border-slate-700">
                  Analyze ROI Metrics
                </Link>
              </div>
            </div>

            {/* Sidebar quick actions & repairs */}
            <div className="space-y-6">
              <div className={`border p-6 rounded-2xl shadow-xl ${cardBgClass}`}>
                <h3 className="font-bold text-sm mb-4">Operations Quick Panel</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/vehicles?add=true" className="p-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 border border-blue-500/20">
                    <PlusCircle className="h-3.5 w-3.5" /> Add Vehicle
                  </Link>
                  <Link href="/drivers?add=true" className="p-3 bg-violet-500/10 hover:bg-violet-500/20 text-violet-500 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 border border-violet-500/20">
                    <PlusCircle className="h-3.5 w-3.5" /> Add Driver
                  </Link>
                  <Link href="/trips?new=true" className="p-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 rounded-xl text-xs font-bold transition-all text-center col-span-2 flex items-center justify-center gap-1.5 border border-indigo-500/20">
                    <PlusCircle className="h-3.5 w-3.5" /> Dispatch New Route
                  </Link>
                </div>
              </div>

              <div className={`border p-6 rounded-2xl shadow-xl space-y-4 ${cardBgClass}`}>
                <div className="flex items-center gap-2 border-b border-slate-500/10 pb-3">
                  <Wrench className="h-5 w-5 text-red-500" />
                  <div>
                    <h3 className="font-bold text-sm">Workshop Holds</h3>
                    <p className="text-[10px] text-slate-400">Vehicles currently In Shop</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {inShopVehicles.length > 0 ? (
                    inShopVehicles.map(v => (
                      <div key={v.id} className="p-3 rounded-xl flex items-center justify-between border border-red-500/10 bg-red-500/5">
                        <div>
                          <span className="text-xs font-bold">{v.registration_number}</span>
                          <span className="block text-[10px] text-slate-400">{v.model}</span>
                        </div>
                        <span className="px-2 py-0.5 bg-red-500/10 text-red-500 rounded-full text-[9px] font-bold">In Shop</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 font-medium py-2 text-center">All vehicles active. No workshop holds.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 2. DISPATCHER DASHBOARD VIEW */}
      {/* ========================================================================= */}
      {role === 'Dispatcher' && (
        <>
          {/* Dispatcher KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className={`border p-6 rounded-2xl flex items-center justify-between group transition-all duration-300 ${cardBgClass}`}>
              <div className="space-y-2">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Active Transit Trips</span>
                <span className={`text-3xl font-extrabold ${textPrimary}`}>{activeTrips}</span>
                <span className="text-xs text-slate-400 block font-medium">In transit cargo routes</span>
              </div>
              <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-500">
                <Activity className="h-6 w-6 animate-pulse" />
              </div>
            </div>

            <div className={`border p-6 rounded-2xl flex items-center justify-between group transition-all duration-300 ${cardBgClass}`}>
              <div className="space-y-2">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Draft Reservations</span>
                <span className={`text-3xl font-extrabold ${textPrimary}`}>{trips.filter(t => t.status === 'Draft').length}</span>
                <span className="text-xs text-slate-400 block font-medium">Awaiting driver confirmations</span>
              </div>
              <div className="p-4 bg-yellow-500/10 rounded-2xl text-yellow-500">
                <Calendar className="h-6 w-6" />
              </div>
            </div>

            <div className={`border p-6 rounded-2xl flex items-center justify-between group transition-all duration-300 ${cardBgClass}`}>
              <div className="space-y-2">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Available Drivers</span>
                <span className={`text-3xl font-extrabold ${textPrimary}`}>{drivers.filter(d => d.status === 'Available').length}</span>
                <span className="text-xs text-slate-400 block font-medium">Ready for dispatch assignment</span>
              </div>
              <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500">
                <Users className="h-6 w-6" />
              </div>
            </div>

            <div className={`border p-6 rounded-2xl flex items-center justify-between group transition-all duration-300 ${cardBgClass}`}>
              <div className="space-y-2">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Available Vehicles</span>
                <span className={`text-3xl font-extrabold ${textPrimary}`}>{vehicles.filter(v => v.status === 'Available').length}</span>
                <span className="text-xs text-slate-400 block font-medium">Ready load capacity</span>
              </div>
              <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-500">
                <Truck className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className={`lg:col-span-2 border rounded-2xl p-6 shadow-xl flex flex-col justify-between ${cardBgClass}`}>
              <div>
                <h3 className="font-bold text-md mb-2">Live Transit Coordinates</h3>
                <p className="text-xs text-slate-400 mb-4 font-medium">GPS Telematics simulator for dispatched deliveries</p>
                
                <div className={`relative h-64 w-full rounded-xl overflow-hidden flex flex-col items-center justify-center p-4 border ${mapBgClass}`}>
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-20"></div>
                  
                  {currentTransitTrip ? (
                    <div className="w-full relative flex flex-col justify-between h-full z-10 p-4">
                      <div className="flex justify-between text-xs font-bold border-b border-slate-500/10 pb-2">
                        <span>TRIP #{currentTransitTrip.trip_number}</span>
                        <span className="text-blue-500">{currentTransitTrip.source} → {currentTransitTrip.destination}</span>
                      </div>
                      <div className="relative flex items-center justify-between my-auto">
                        <div className="absolute left-10 right-10 h-0.5 bg-slate-300 dark:bg-slate-800 top-1/2 -translate-y-1/2">
                          <div className="bg-blue-500 h-full" style={{ width: `${simProgress}%` }}></div>
                        </div>
                        <div className="p-2 bg-white dark:bg-slate-800 border rounded-full"><MapPin className="h-4 w-4" /></div>
                        <div className="absolute z-20 flex flex-col items-center -translate-y-1/2 top-1/2" style={{ left: `calc(2.5rem + (100% - 7rem) * ${simProgress / 100})` }}>
                          <Truck className="h-5 w-5 text-blue-500 animate-bounce" />
                        </div>
                        <div className="p-2 bg-white dark:bg-slate-800 border rounded-full"><MapPin className="h-4 w-4" /></div>
                      </div>
                      <div className="text-[10px] text-center font-bold text-slate-400">
                        {simProgress}% route coverage completed
                      </div>
                    </div>
                  ) : (
                    <div className="text-center z-10 space-y-2">
                      <Truck className="h-8 w-8 text-slate-500 mx-auto" />
                      <p className="text-xs">No active dispatches. Create one on the Trip Board.</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <Link href="/trips" className="w-full block py-3 bg-blue-600 text-white rounded-xl text-xs font-bold text-center hover:bg-blue-500 transition-all">
                  Open Dispatch Desk
                </Link>
              </div>
            </div>

            <div className="space-y-6">
              <div className={`border p-6 rounded-2xl shadow-xl ${cardBgClass}`}>
                <h3 className="font-bold text-sm mb-4">Dispatcher desk</h3>
                <Link href="/trips?new=true" className="w-full py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-xl text-xs font-bold transition-all border border-blue-500/20 flex items-center justify-center gap-2">
                  <PlusCircle className="h-4 w-4" /> Dispatch New Route
                </Link>
              </div>

              <div className={`border p-6 rounded-2xl shadow-xl space-y-3 ${cardBgClass}`}>
                <h3 className="font-bold text-xs border-b border-slate-500/10 pb-2">Active driver status</h3>
                {drivers.map(d => (
                  <div key={d.id} className="flex justify-between items-center text-xs py-1 border-b border-slate-500/5">
                    <span>{d.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      d.status === 'Available' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'
                    }`}>{d.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 3. SAFETY OFFICER DASHBOARD VIEW */}
      {/* ========================================================================= */}
      {role === 'Safety Officer' && (
        <>
          {/* Safety KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className={`border p-6 rounded-2xl flex items-center justify-between group transition-all duration-300 ${cardBgClass}`}>
              <div className="space-y-2">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Average Safety Score</span>
                <span className={`text-3xl font-extrabold ${textPrimary}`}>{avgSafetyScore} / 100</span>
                <span className="text-xs text-slate-400 block font-medium">Across active operators</span>
              </div>
              <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500">
                <ShieldCheck className="h-6 w-6" />
              </div>
            </div>

            <div className={`border p-6 rounded-2xl flex items-center justify-between group transition-all duration-300 ${cardBgClass}`}>
              <div className="space-y-2">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Expiring Licenses</span>
                <span className={`text-3xl font-extrabold ${
                  expiringLicenses.length > 0 ? 'text-red-500' : textPrimary
                }`}>{expiringLicenses.length}</span>
                <span className="text-xs text-slate-400 block font-medium">Expires within 30 days</span>
              </div>
              <div className={`p-4 rounded-2xl ${expiringLicenses.length > 0 ? 'bg-red-500/10 text-red-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>

            <div className={`border p-6 rounded-2xl flex items-center justify-between group transition-all duration-300 ${cardBgClass}`}>
              <div className="space-y-2">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Suspended Driver Holds</span>
                <span className={`text-3xl font-extrabold ${textPrimary}`}>{suspendedDriversCount}</span>
                <span className="text-xs text-slate-400 block font-medium">Accounts flagged for safety</span>
              </div>
              <div className="p-4 bg-red-500/10 rounded-2xl text-red-500">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>

            <div className={`border p-6 rounded-2xl flex items-center justify-between group transition-all duration-300 ${cardBgClass}`}>
              <div className="space-y-2">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Drivers On Duty</span>
                <span className={`text-3xl font-extrabold ${textPrimary}`}>{totalDrivers}</span>
                <span className="text-xs text-slate-400 block font-medium">Total registered operators</span>
              </div>
              <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-500">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className={`lg:col-span-2 border p-6 rounded-2xl shadow-xl space-y-4 ${cardBgClass}`}>
              <h3 className="font-bold text-md">Compliance registry audit</h3>
              <p className="text-xs text-slate-400">Review driving credentials, license expiries, and individual score audits</p>
              
              <div className="divide-y divide-slate-800/10">
                {drivers.map(d => {
                  const scoreVal = Number(d.safety_score);
                  return (
                    <div key={d.id} className="py-3 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-semibold block">{d.name}</span>
                        <span className="text-[10px] text-slate-400 block">License: {d.license_number} ({d.license_category})</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Safety Score</span>
                          <span className={`font-bold ${
                            scoreVal >= 85 ? 'text-emerald-500' : scoreVal >= 70 ? 'text-yellow-500' : 'text-red-500'
                          }`}>{scoreVal} / 100</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          d.status === 'Suspended' 
                            ? 'bg-red-500/10 text-red-500' 
                            : 'bg-emerald-500/10 text-emerald-500'
                        }`}>{d.status}</span>
                      </div>
                    </div>
                  );
                })}
                {drivers.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">No driver registers exist. Create one in Driver Registry.</p>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className={`border p-6 rounded-2xl shadow-xl ${cardBgClass}`}>
                <h3 className="font-bold text-sm mb-4">Safety Quick actions</h3>
                <Link href="/drivers?add=true" className="w-full py-3 bg-violet-500/10 hover:bg-violet-500/20 text-violet-500 rounded-xl text-xs font-bold transition-all border border-violet-500/20 flex items-center justify-center gap-2">
                  <PlusCircle className="h-4 w-4" /> Add Driver Register
                </Link>
              </div>

              <div className={`border p-6 rounded-2xl shadow-xl space-y-4 ${cardBgClass}`}>
                <h3 className="font-bold text-xs border-b border-slate-500/10 pb-2">Expiring licenses warning</h3>
                {expiringLicenses.length > 0 ? (
                  expiringLicenses.map(d => (
                    <div key={d.id} className="p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/10 text-xs flex justify-between items-center">
                      <span>{d.name}</span>
                      <span className="text-[10px] text-yellow-500 font-bold">{d.license_expiry_date}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-slate-400 py-1">No driver licenses expiring within 30 days.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 4. FINANCIAL ANALYST DASHBOARD VIEW */}
      {/* ========================================================================= */}
      {role === 'Financial Analyst' && (
        <>
          {/* Financial KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className={`border p-6 rounded-2xl flex items-center justify-between group transition-all duration-300 ${cardBgClass}`}>
              <div className="space-y-2">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Estimated Fuel costs</span>
                <span className={`text-3xl font-extrabold ${textPrimary}`}>$335.00</span>
                <span className="text-xs text-slate-400 block font-medium">Logged fleet fuel transactions</span>
              </div>
              <div className="p-4 bg-yellow-500/10 rounded-2xl text-yellow-500">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>

            <div className={`border p-6 rounded-2xl flex items-center justify-between group transition-all duration-300 ${cardBgClass}`}>
              <div className="space-y-2">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Workshop Repair Expenses</span>
                <span className={`text-3xl font-extrabold ${textPrimary}`}>$450.00</span>
                <span className="text-xs text-slate-400 block font-medium">Logged workshop billing</span>
              </div>
              <div className="p-4 bg-red-500/10 rounded-2xl text-red-500">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>

            <div className={`border p-6 rounded-2xl flex items-center justify-between group transition-all duration-300 ${cardBgClass}`}>
              <div className="space-y-2">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Estimated Revenue</span>
                <span className={`text-3xl font-extrabold ${textPrimary}`}>$1,250.00</span>
                <span className="text-xs text-slate-400 block font-medium">Computed cargo load mileage</span>
              </div>
              <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>

            <div className={`border p-6 rounded-2xl flex items-center justify-between group transition-all duration-300 ${cardBgClass}`}>
              <div className="space-y-2">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Active Fleet Size</span>
                <span className={`text-3xl font-extrabold ${textPrimary}`}>{totalVehicles}</span>
                <span className="text-xs text-slate-400 block font-medium">Assets subject to depreciation</span>
              </div>
              <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-500">
                <Truck className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className={`lg:col-span-2 border p-6 rounded-2xl shadow-xl space-y-4 ${cardBgClass}`}>
              <h3 className="font-bold text-md">Recent Expense indicators</h3>
              <p className="text-xs text-slate-400">Consolidated ledger for fleet operations, fuel consumption, tolls, and maintenance</p>
              
              <div className="divide-y divide-slate-800/10 text-xs">
                <div className="py-3 flex justify-between items-center">
                  <div>
                    <span className="font-semibold block">State Expressway Toll</span>
                    <span className="text-[10px] text-slate-400">Vehicle: VAN-05</span>
                  </div>
                  <span className="font-bold text-red-500">-$24.50</span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <div>
                    <span className="font-semibold block">Emergency Tire Repair Hold</span>
                    <span className="text-[10px] text-slate-400">Vehicle: TRK-12</span>
                  </div>
                  <span className="font-bold text-red-500">-$350.00</span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <div>
                    <span className="font-semibold block">Port Cargo Toll Overhead</span>
                    <span className="text-[10px] text-slate-400">Vehicle: VAN-03</span>
                  </div>
                  <span className="font-bold text-red-500">-$48.00</span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className={`border p-6 rounded-2xl shadow-xl ${cardBgClass}`}>
                <h3 className="font-bold text-sm mb-4">Financial Reports</h3>
                <Link href="/reports" className="w-full py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-xl text-xs font-bold transition-all border border-emerald-500/20 flex items-center justify-center gap-2">
                  <FileText className="h-4 w-4" /> Open Analytics & ROI
                </Link>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 5. DRIVER DASHBOARD VIEW */}
      {/* ========================================================================= */}
      {role === 'Driver' && (
        <>
          {/* Driver KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className={`border p-6 rounded-2xl flex items-center justify-between group transition-all duration-300 ${cardBgClass}`}>
              <div className="space-y-2">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">My Assigned Active Trips</span>
                <span className={`text-3xl font-extrabold ${textPrimary}`}>{activeTrips}</span>
                <span className="text-xs text-slate-400 block font-medium">Currently in transit</span>
              </div>
              <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-500">
                <Truck className="h-6 w-6" />
              </div>
            </div>

            <div className={`border p-6 rounded-2xl flex items-center justify-between group transition-all duration-300 ${cardBgClass}`}>
              <div className="space-y-2">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">My Safety Performance</span>
                <span className={`text-3xl font-extrabold ${textPrimary}`}>98 / 100</span>
                <span className="text-xs text-slate-400 block font-medium">Excellent safety standing</span>
              </div>
              <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500">
                <ShieldCheck className="h-6 w-6" />
              </div>
            </div>

            <div className={`border p-6 rounded-2xl flex items-center justify-between group transition-all duration-300 ${cardBgClass}`}>
              <div className="space-y-2">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Total My Logged Trips</span>
                <span className={`text-3xl font-extrabold ${textPrimary}`}>{trips.filter(t => t.status === 'Completed').length}</span>
                <span className="text-xs text-slate-400 block font-medium">Completed delivery orders</span>
              </div>
              <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-500">
                <Calendar className="h-6 w-6" />
              </div>
            </div>

            <div className={`border p-6 rounded-2xl flex items-center justify-between group transition-all duration-300 ${cardBgClass}`}>
              <div className="space-y-2">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Account status</span>
                <span className={`text-3xl font-extrabold text-emerald-500`}>Active</span>
                <span className="text-xs text-slate-400 block font-medium">License checked & verified</span>
              </div>
              <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500">
                <ShieldCheck className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className={`lg:col-span-2 border p-6 rounded-2xl shadow-xl flex flex-col justify-between ${cardBgClass}`}>
              <div>
                <h3 className="font-bold text-md mb-2">My Active Delivery Transit</h3>
                <p className="text-xs text-slate-400 mb-4">Real-time GPS telematics of your active trip route</p>

                <div className={`relative h-64 w-full rounded-xl overflow-hidden flex flex-col items-center justify-center p-4 border ${mapBgClass}`}>
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-20"></div>
                  
                  {currentTransitTrip ? (
                    <div className="w-full relative flex flex-col justify-between h-full z-10 p-4">
                      <div className="flex justify-between text-xs font-bold border-b border-slate-500/10 pb-2">
                        <span>ROUTE #{currentTransitTrip.trip_number}</span>
                        <span>{currentTransitTrip.source} → {currentTransitTrip.destination}</span>
                      </div>
                      <div className="relative flex items-center justify-between my-auto">
                        <div className="absolute left-10 right-10 h-0.5 bg-slate-300 dark:bg-slate-800 top-1/2 -translate-y-1/2">
                          <div className="bg-blue-500 h-full" style={{ width: `${simProgress}%` }}></div>
                        </div>
                        <div className="p-2 bg-white dark:bg-slate-800 border rounded-full"><MapPin className="h-4 w-4" /></div>
                        <div className="absolute z-20 flex flex-col items-center -translate-y-1/2 top-1/2" style={{ left: `calc(2.5rem + (100% - 7rem) * ${simProgress / 100})` }}>
                          <Truck className="h-5 w-5 text-blue-500 animate-bounce" />
                        </div>
                        <div className="p-2 bg-white dark:bg-slate-800 border rounded-full"><MapPin className="h-4 w-4" /></div>
                      </div>
                      <p className="text-[10px] text-center text-slate-400 font-bold">You are currently {simProgress}% into this dispatch. Drive safely!</p>
                    </div>
                  ) : (
                    <div className="text-center z-10 space-y-2">
                      <Truck className="h-8 w-8 text-slate-500 mx-auto" />
                      <p className="text-xs">No active route assigned. Contact dispatch desk.</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <Link href="/trips" className="w-full block py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold text-center transition-all">
                  Open My Trip Board
                </Link>
              </div>
            </div>

            <div className="space-y-6">
              <div className={`border p-6 rounded-2xl shadow-xl space-y-3 ${cardBgClass}`}>
                <h3 className="font-bold text-xs border-b border-slate-500/10 pb-2">Assigned Logs</h3>
                <div className="p-3 rounded-xl border border-slate-800/10 bg-slate-500/5 text-xs">
                  <span className="font-bold block">Next Shift Schedule</span>
                  <span className="text-[10px] text-slate-400 block mt-1">Check scheduled routes inside the Trip Board menu.</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
