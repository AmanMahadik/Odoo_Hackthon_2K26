'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { useRole } from '@/lib/roleContext';
import { Vehicle, Trip, FuelLog, Expense, MaintenanceLog } from '@/lib/mockData';
import { 
  Download, 
  TrendingUp, 
  Percent, 
  DollarSign, 
  Sliders, 
  ChevronRight,
  RefreshCw
} from 'lucide-react';

interface VehicleROIReport {
  vehicleId: string;
  registrationNumber: string;
  model: string;
  acquisitionCost: number;
  fuelCost: number;
  maintenanceCost: number;
  otherExpenses: number;
  totalCosts: number;
  totalRevenues: number;
  netProfit: number;
  roiPercentage: number;
  distanceCovered: number;
  litersConsumed: number;
  fuelEfficiency: number; // km/L
}

export default function ReportsPage() {
  const { canAccess } = useRole();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [mLogs, setMLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);

  // What-If Simulator Sliders (percentage change from 0% default)
  const [fuelSlider, setFuelSlider] = useState(0);
  const [maintenanceSlider, setMaintenanceSlider] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [v, t, f, e, m] = await Promise.all([
        db.getVehicles(),
        db.getTrips(),
        db.getFuelLogs(),
        db.getExpenses(),
        db.getMaintenanceLogs()
      ]);
      setVehicles(v);
      setTrips(t);
      setFuelLogs(f);
      setExpenses(e);
      setMLogs(m);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate base report data
  const baseReportData: VehicleROIReport[] = vehicles.map(v => {
    // 1. Odometer distance completed in trips
    const vehicleTrips = trips.filter(t => t.vehicle_id === v.id && t.status === 'Completed');
    const totalDistance = vehicleTrips.reduce((sum, t) => sum + (t.actual_distance || t.planned_distance), 0);

    // 2. Fuel metrics
    const vehicleFuelLogs = fuelLogs.filter(f => f.vehicle_id === v.id);
    const totalLiters = vehicleFuelLogs.reduce((sum, f) => sum + f.liters, 0);
    const totalFuelCost = vehicleFuelLogs.reduce((sum, f) => sum + f.cost, 0);

    // 3. Maintenance metrics
    const vehicleMaintenanceLogs = mLogs.filter(m => m.vehicle_id === v.id);
    const totalMaintenanceCost = vehicleMaintenanceLogs.reduce((sum, m) => sum + m.cost, 0);

    // 4. Other expenses (e.g. tolls)
    const vehicleExpenses = expenses.filter(e => e.vehicle_id === v.id && e.type !== 'repair');
    const totalOtherCost = vehicleExpenses.reduce((sum, e) => sum + e.amount, 0);

    // 5. Revenues: Mock revenue at $4.00 per km for completed runs
    const totalRevenues = totalDistance * 4.00;

    const totalCosts = totalFuelCost + totalMaintenanceCost + totalOtherCost;
    const netProfit = totalRevenues - totalCosts;
    const roiPercentage = v.acquisition_cost > 0 ? (netProfit / v.acquisition_cost) * 100 : 0;
    const fuelEfficiency = totalLiters > 0 ? Number((totalDistance / totalLiters).toFixed(2)) : 0;

    return {
      vehicleId: v.id,
      registrationNumber: v.registration_number,
      model: v.model,
      acquisitionCost: v.acquisition_cost,
      fuelCost: totalFuelCost,
      maintenanceCost: totalMaintenanceCost,
      otherExpenses: totalOtherCost,
      totalCosts,
      totalRevenues,
      netProfit,
      roiPercentage,
      distanceCovered: totalDistance,
      litersConsumed: totalLiters,
      fuelEfficiency
    };
  });

  // Simulator modifier calculations
  const simReportData = baseReportData.map(item => {
    const adjustedFuel = item.fuelCost * (1 + fuelSlider / 100);
    const adjustedMaint = item.maintenanceCost * (1 + maintenanceSlider / 100);
    const adjustedCosts = adjustedFuel + adjustedMaint + item.otherExpenses;
    const adjustedProfit = item.totalRevenues - adjustedCosts;
    const adjustedROI = item.acquisitionCost > 0 ? (adjustedProfit / item.acquisitionCost) * 100 : 0;

    return {
      ...item,
      fuelCost: adjustedFuel,
      maintenanceCost: adjustedMaint,
      totalCosts: adjustedCosts,
      netProfit: adjustedProfit,
      roiPercentage: adjustedROI
    };
  });

  // Calculate fleet summaries
  const totalFleetProfit = simReportData.reduce((sum, i) => sum + i.netProfit, 0);
  const totalFleetCosts = simReportData.reduce((sum, i) => sum + i.totalCosts, 0);
  const totalFleetRevenue = simReportData.reduce((sum, i) => sum + i.totalRevenues, 0);
  const avgFleetROI = simReportData.length > 0 ? simReportData.reduce((sum, i) => sum + i.roiPercentage, 0) / simReportData.length : 0;

  // Export to CSV
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Registration Number,Model,Acquisition Cost,Fuel Cost,Maintenance Cost,Other Expenses,Total Running Costs,Total Revenues,Net Profit,ROI %\n';

    simReportData.forEach(item => {
      csvContent += `"${item.registrationNumber}","${item.model}",${item.acquisitionCost},${item.fuelCost.toFixed(2)},${item.maintenanceCost.toFixed(2)},${item.otherExpenses.toFixed(2)},${item.totalCosts.toFixed(2)},${item.totalRevenues.toFixed(2)},${item.netProfit.toFixed(2)},${item.roiPercentage.toFixed(2)}%\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TransitOps_ROI_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-100">Financial Reports & ROI</h2>
          <p className="text-xs text-slate-400">Export fleet profit metrics and model scenario parameters</p>
        </div>

        {canAccess('reports', 'export') && (
          <div className="flex gap-3 print:hidden">
            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 bg-[#171d33] border border-slate-700/80 hover:bg-slate-850 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="h-4 w-4 text-purple-400" /> Export PDF
            </button>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/10 cursor-pointer"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>
        )}
      </div>

      {/* Simulator Control Center Panel */}
      <div className="bg-[#0F1424]/90 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6 print:hidden">
        <div className="flex items-center gap-2 border-b border-slate-850 pb-3">
          <Sliders className="h-5 w-5 text-blue-400" />
          <div>
            <h3 className="font-extrabold text-slate-200 text-sm">"What-If" Cost Sensitivity Simulator</h3>
            <p className="text-[10px] text-slate-400">Model fluctuations in raw fuel rates and shop labor index rates</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Fuel Slider */}
          <div className="space-y-3">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-300">Fuel Price Variance</span>
              <span className={fuelSlider > 0 ? 'text-red-400 font-mono' : fuelSlider < 0 ? 'text-emerald-400 font-mono' : 'text-slate-400 font-mono'}>
                {fuelSlider > 0 ? `+${fuelSlider}%` : `${fuelSlider}%`}
              </span>
            </div>
            <input
              type="range"
              min="-20"
              max="50"
              value={fuelSlider}
              onChange={(e) => setFuelSlider(Number(e.target.value))}
              className="w-full accent-blue-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-medium">
              <span>-20% (Discount)</span>
              <span>Baseline</span>
              <span>+50% (Surcharge)</span>
            </div>
          </div>

          {/* Maintenance Slider */}
          <div className="space-y-3">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-300">Maintenance Cost Variance</span>
              <span className={maintenanceSlider > 0 ? 'text-red-400 font-mono' : 'text-slate-400 font-mono'}>
                {maintenanceSlider > 0 ? `+${maintenanceSlider}%` : `${maintenanceSlider}%`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={maintenanceSlider}
              onChange={(e) => setMaintenanceSlider(Number(e.target.value))}
              className="w-full accent-purple-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-medium">
              <span>Baseline (0%)</span>
              <span>+50% (Labor Spike)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Impact Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl text-center space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block">Simulated Net Profit</span>
          <span className={`text-2xl font-black block font-mono ${totalFleetProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            ${totalFleetProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-slate-500">Revenues: ${totalFleetRevenue.toLocaleString()}</span>
        </div>

        <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl text-center space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block">Simulated Fleet Costs</span>
          <span className="text-2xl font-black text-white block font-mono">
            ${totalFleetCosts.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-slate-500">Includes slider adjustments</span>
        </div>

        <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl text-center space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block">Average Fleet ROI</span>
          <span className={`text-2xl font-black block font-mono ${avgFleetROI >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
            {avgFleetROI.toFixed(2)}%
          </span>
          <span className="text-[10px] text-slate-500">Returns against acquisition</span>
        </div>
      </div>

      {/* ROI Report Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="bg-[#0F1424]/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-4 border-b border-slate-850 bg-slate-900/40 flex justify-between items-center">
            <span className="font-bold text-xs text-slate-200">Vehicle Ledger Performance Summary</span>
            <span className="text-[10px] text-slate-500 font-medium">Trip Revenue rate set to $4.00/km</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/50 border-b border-slate-850 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="p-4">Vehicle</th>
                  <th className="p-4">Fuel Costs</th>
                  <th className="p-4">Service Costs</th>
                  <th className="p-4">Toll Expenses</th>
                  <th className="p-4">Total Costs</th>
                  <th className="p-4">Trip Revenues</th>
                  <th className="p-4">Net Profit</th>
                  <th className="p-4">Fuel Efficiency</th>
                  <th className="p-4">ROI %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 font-medium">
                {simReportData.map((item) => (
                  <tr key={item.vehicleId} className="hover:bg-slate-800/20 transition-colors">
                    <td className="p-4 font-bold text-slate-200">
                      {item.registrationNumber}
                      <span className="block text-[10px] text-slate-500 font-sans font-normal">{item.model}</span>
                    </td>
                    <td className="p-4 text-slate-400 font-mono">${item.fuelCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className="p-4 text-slate-400 font-mono">${item.maintenanceCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className="p-4 text-slate-400 font-mono">${item.otherExpenses.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className="p-4 text-slate-400 font-bold font-mono">${item.totalCosts.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className="p-4 text-slate-400 font-bold font-mono">${item.totalRevenues.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className={`p-4 font-black font-mono ${item.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      ${item.netProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-slate-300 font-mono">{item.fuelEfficiency > 0 ? `${item.fuelEfficiency} km/L` : 'N/A'}</td>
                    <td className={`p-4 font-extrabold font-mono ${item.roiPercentage >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                      {item.roiPercentage.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
