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
  Database
} from 'lucide-react';

export default function Dashboard() {
  const { role } = useRole();
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

  // Safety Officer Alerts: license expiring in 30 days
  const expiringLicenses = drivers.filter(d => {
    const expiry = new Date(d.license_expiry_date);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  });

  // Fleet Manager: Vehicles in shop
  const inShopVehicles = vehicles.filter(v => v.status === 'In Shop');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Database Mode Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-900/50 border border-slate-800 rounded-2xl gap-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${dbMode.includes('Live') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
            <Database className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Connection State</span>
            <span className="text-sm font-bold text-slate-200">{dbMode}</span>
          </div>
        </div>
        <div className="text-xs text-slate-400 font-medium">
          Source SQL setup: <Link href="/supabase_schema.sql" className="text-blue-400 hover:underline font-semibold">supabase_schema.sql</Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Utilization */}
        <div className="bg-[#0F1424]/90 border border-slate-800 p-6 rounded-2xl shadow-xl flex items-center justify-between group hover:border-slate-700 transition-all duration-300">
          <div className="space-y-2">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Fleet Utilization</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{utilizationRate}%</span>
              <span className="text-xs text-slate-400 font-medium">of active fleet</span>
            </div>
            <div className="w-36 bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-1000"
                style={{ width: `${utilizationRate}%` }}
              ></div>
            </div>
          </div>
          <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-400 group-hover:scale-110 transition-transform">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

        {/* Vehicles */}
        <div className="bg-[#0F1424]/90 border border-slate-800 p-6 rounded-2xl shadow-xl flex items-center justify-between group hover:border-slate-700 transition-all duration-300">
          <div className="space-y-2">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Active Fleet Size</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{totalVehicles}</span>
              <span className="text-xs text-slate-400 font-medium">{activeVehiclesOnTrip} dispatched</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">Excludes retired units</p>
          </div>
          <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-400 group-hover:scale-110 transition-transform">
            <Truck className="h-6 w-6" />
          </div>
        </div>

        {/* Drivers */}
        <div className="bg-[#0F1424]/90 border border-slate-800 p-6 rounded-2xl shadow-xl flex items-center justify-between group hover:border-slate-700 transition-all duration-300">
          <div className="space-y-2">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Drivers On Duty</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{totalDrivers}</span>
              <span className="text-xs text-slate-400 font-medium">{activeDriversOnTrip} on trip</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">Available registry capacity</p>
          </div>
          <div className="p-4 bg-violet-500/10 rounded-2xl text-violet-400 group-hover:scale-110 transition-transform">
            <Users className="h-6 w-6" />
          </div>
        </div>

        {/* Maintenance */}
        <div className="bg-[#0F1424]/90 border border-slate-800 p-6 rounded-2xl shadow-xl flex items-center justify-between group hover:border-slate-700 transition-all duration-300">
          <div className="space-y-2">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Open Repairs</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{openMaintenanceCount}</span>
              <span className="text-xs text-slate-400 font-medium">pending shop</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">Requires technician check</p>
          </div>
          <div className={`p-4 rounded-2xl group-hover:scale-110 transition-transform ${openMaintenanceCount > 0 ? 'bg-red-500/10 text-red-400 animate-pulse' : 'bg-emerald-500/10 text-emerald-400'}`}>
            <Wrench className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Telematics Map Simulator & Right Panel Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Telematics GPS Simulator */}
        <div className="lg:col-span-2 bg-[#0F1424]/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-slate-200 text-md">Live GPS Telematics</h3>
                <p className="text-xs text-slate-400 font-medium">Real-time coordinates broadcast</p>
              </div>
              <span className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping"></span>
                Active Sim Stream
              </span>
            </div>

            {/* Custom Interactive Map Representation */}
            <div className="relative h-64 w-full bg-[#080B13] border border-slate-800 rounded-xl overflow-hidden flex flex-col items-center justify-center p-4">
              {/* Map grid lines simulation */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-20"></div>
              
              {/* Graphical representation of Source & Destination */}
              {currentTransitTrip ? (
                <div className="w-full relative flex flex-col justify-between h-full z-10 p-4">
                  {/* Trip Number */}
                  <div className="flex justify-between text-xs text-slate-400 font-bold border-b border-slate-800/80 pb-2">
                    <span>TRIP ID: TRP-2024-{currentTransitTrip.trip_number || '1002'}</span>
                    <span className="text-blue-400">CARGO: {currentTransitTrip.cargo_weight} KG</span>
                  </div>

                  {/* Route Visualizer */}
                  <div className="relative flex items-center justify-between my-auto">
                    {/* Path line */}
                    <div className="absolute left-10 right-10 h-0.5 bg-slate-800 top-1/2 -translate-y-1/2 overflow-hidden">
                      <div 
                        className="bg-blue-500 h-full transition-all duration-300"
                        style={{ width: `${simProgress}%` }}
                      ></div>
                    </div>

                    {/* Source node */}
                    <div className="flex flex-col items-center gap-1 z-10">
                      <div className="p-2 bg-slate-800/90 border border-slate-700 rounded-full text-slate-300">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-300 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                        {currentTransitTrip.source}
                      </span>
                    </div>

                    {/* Vehicle Dot */}
                    <div 
                      className="absolute z-20 flex flex-col items-center -translate-y-1/2 top-1/2"
                      style={{ left: `calc(2.5rem + (100% - 7rem) * ${simProgress / 100})` }}
                    >
                      <div className="p-1.5 bg-blue-500 border border-white rounded-full shadow-lg shadow-blue-500/50 animate-bounce">
                        <Truck className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-[9px] font-extrabold text-blue-400 uppercase tracking-widest mt-1 block">
                        {simProgress}% done
                      </span>
                    </div>

                    {/* Destination node */}
                    <div className="flex flex-col items-center gap-1 z-10">
                      <div className="p-2 bg-slate-800/90 border border-slate-700 rounded-full text-slate-300">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-300 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                        {currentTransitTrip.destination}
                      </span>
                    </div>
                  </div>

                  {/* Operational Detail Footer */}
                  <div className="grid grid-cols-2 gap-4 text-[10px] text-slate-400 bg-slate-900/60 border border-slate-800/80 p-2.5 rounded-lg">
                    <div>
                      <span className="block font-bold">VEHICLE ASSIGNED:</span>
                      <span className="text-slate-300">{currentTransitTrip.vehicle?.registration_number || 'TRK-12'} ({currentTransitTrip.vehicle?.model || 'Isuzu NPR'})</span>
                    </div>
                    <div>
                      <span className="block font-bold">DISPATCHED OPERATOR:</span>
                      <span className="text-slate-300">{currentTransitTrip.driver?.name || 'Sarah Chen'} (Score: {currentTransitTrip.driver?.safety_score || '88'})</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center z-10 space-y-2">
                  <Truck className="h-10 w-10 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400 font-semibold">No active dispatched trips in transit.</p>
                  <p className="text-[10px] text-slate-500">Go to the Trip Board and dispatch a draft trip to simulate live tracking.</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex gap-4">
            <Link 
              href="/trips" 
              className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl text-xs font-semibold text-center hover:bg-blue-500 transition-all flex items-center justify-center gap-2"
            >
              Go to Trip Board <ArrowRight className="h-4 w-4" />
            </Link>
            <Link 
              href="/reports" 
              className="flex-1 py-3 px-4 bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold text-center hover:bg-slate-700 transition-all border border-slate-700"
            >
              Analyze ROI Metrics
            </Link>
          </div>
        </div>

        {/* Sidebar Alerts / Role Information */}
        <div className="space-y-6">
          {/* Quick Actions Panel */}
          <div className="bg-[#0F1424]/90 border border-slate-800 p-6 rounded-2xl shadow-xl">
            <h3 className="font-bold text-slate-200 text-sm mb-4">Operations Panel</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/vehicles?add=true" className="p-3 bg-slate-800/50 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold border border-slate-800/80 transition-all text-center">
                Add Vehicle
              </Link>
              <Link href="/drivers?add=true" className="p-3 bg-slate-800/50 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold border border-slate-800/80 transition-all text-center">
                Add Driver
              </Link>
              <Link href="/trips?new=true" className="p-3 bg-slate-800/50 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold border border-slate-800/80 transition-all text-center col-span-2">
                Dispatch New Route
              </Link>
            </div>
          </div>

          {/* Role Differentiated Insights */}
          <div className="bg-[#0F1424]/90 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <ShieldCheck className="h-5 w-5 text-blue-400" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block">Active Role Perspective</span>
                <h3 className="font-bold text-slate-200 text-sm">{role} Insights</h3>
              </div>
            </div>

            {/* Role specific components */}
            {role === 'Fleet Manager' && (
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">In-Shop Diagnostics</span>
                {inShopVehicles.length > 0 ? (
                  inShopVehicles.map(v => (
                    <div key={v.id} className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-200">{v.registration_number}</span>
                        <span className="block text-[10px] text-slate-400">{v.model}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-red-500/15 text-red-400 rounded-full text-[9px] font-bold">In Shop</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 font-medium">All vehicles available. No active shop holds.</p>
                )}
              </div>
            )}

            {role === 'Safety Officer' && (
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">License Compliance Watch</span>
                {expiringLicenses.length > 0 ? (
                  expiringLicenses.map(d => {
                    const expiry = new Date(d.license_expiry_date);
                    const today = new Date();
                    const diffTime = expiry.getTime() - today.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return (
                      <div key={d.id} className="p-3 bg-yellow-500/5 border border-yellow-500/10 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-200">{d.name}</span>
                          <span className="block text-[10px] text-slate-400">License Expiry: {d.license_expiry_date}</span>
                        </div>
                        <span className="px-2 py-0.5 bg-yellow-500/15 text-yellow-400 rounded-full text-[9px] font-bold">
                          {diffDays} days left
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 font-medium">All drivers comply with safety registry regulations.</p>
                )}
              </div>
            )}

            {role === 'Financial Analyst' && (
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Expense Indicators</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-800/40 rounded-xl">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase">Fuel Costs</span>
                    <span className="text-md font-bold text-white">$335.00</span>
                  </div>
                  <div className="p-3 bg-slate-800/40 rounded-xl">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase">Repair Costs</span>
                    <span className="text-md font-bold text-white">$450.00</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">View consolidated cost and fuel reports in the Reports tab.</p>
              </div>
            )}

            {role === 'Dispatcher' && (
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Operational Board Alerts</span>
                <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-200">Dispatched Active</span>
                    <span className="block text-[10px] text-slate-400">Trips currently dispatching:</span>
                  </div>
                  <span className="px-2 py-0.5 bg-blue-500/15 text-blue-400 rounded-full text-[9px] font-bold">{activeTrips} Routes</span>
                </div>
              </div>
            )}

            {role === 'Driver' && (
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Delivery Logs</span>
                <div className="p-3 bg-slate-850 rounded-xl border border-slate-800">
                  <span className="text-xs font-bold text-slate-200 block">Next Pickup</span>
                  <span className="text-[10px] text-slate-400 block mt-1">Check scheduled routes inside the Trip Board menu.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
