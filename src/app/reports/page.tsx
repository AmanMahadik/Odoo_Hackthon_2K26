'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { useRole } from '@/lib/roleContext';
import { Vehicle, Trip, FuelLog, Expense, MaintenanceLog } from '@/lib/mockData';
import { Download, Sliders } from 'lucide-react';
import { exportToPDF, exportToCSV } from '@/lib/exportUtils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
  fuelEfficiency: number;
}

export default function ReportsPage() {
  const { canAccess, formatCurrency, currency } = useRole();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [mLogs, setMLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);
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
        db.getMaintenanceLogs(),
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

  const baseReportData: VehicleROIReport[] = vehicles.map((v) => {
    const vehicleTrips = trips.filter((t) => t.vehicle_id === v.id && t.status === 'Completed');
    const totalDistance = vehicleTrips.reduce(
      (sum, t) => sum + (t.actual_distance || t.planned_distance),
      0
    );
    const vehicleFuelLogs = fuelLogs.filter((f) => f.vehicle_id === v.id);
    const totalLiters = vehicleFuelLogs.reduce((sum, f) => sum + f.liters, 0);
    const totalFuelCost = vehicleFuelLogs.reduce((sum, f) => sum + f.cost, 0);
    const vehicleMaintenanceLogs = mLogs.filter((m) => m.vehicle_id === v.id);
    const totalMaintenanceCost = vehicleMaintenanceLogs.reduce((sum, m) => sum + m.cost, 0);
    const vehicleExpenses = expenses.filter((e) => e.vehicle_id === v.id && e.type !== 'repair');
    const totalOtherCost = vehicleExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalRevenues = totalDistance * 4.0;
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
      fuelEfficiency,
    };
  });

  const simReportData = baseReportData.map((item) => {
    const adjustedFuel = item.fuelCost * (1 + fuelSlider / 100);
    const adjustedMaint = item.maintenanceCost * (1 + maintenanceSlider / 100);
    const adjustedCosts = adjustedFuel + adjustedMaint + item.otherExpenses;
    const adjustedProfit = item.totalRevenues - adjustedCosts;
    const adjustedROI =
      item.acquisitionCost > 0 ? (adjustedProfit / item.acquisitionCost) * 100 : 0;
    return {
      ...item,
      fuelCost: adjustedFuel,
      maintenanceCost: adjustedMaint,
      totalCosts: adjustedCosts,
      netProfit: adjustedProfit,
      roiPercentage: adjustedROI,
    };
  });

  const totalFleetProfit = simReportData.reduce((sum, i) => sum + i.netProfit, 0);
  const totalFleetCosts = simReportData.reduce((sum, i) => sum + i.totalCosts, 0);
  const totalFleetRevenue = simReportData.reduce((sum, i) => sum + i.totalRevenues, 0);
  const avgFleetROI =
    simReportData.length > 0
      ? simReportData.reduce((sum, i) => sum + i.roiPercentage, 0) / simReportData.length
      : 0;

  const handleExportCSV = () => {
    const csvData = simReportData.map((item) => ({
      'Registration Number': item.registrationNumber,
      Model: item.model,
      'Acquisition Cost': item.acquisitionCost,
      'Fuel Cost': item.fuelCost.toFixed(2),
      'Maintenance Cost': item.maintenanceCost.toFixed(2),
      'Other Expenses': item.otherExpenses.toFixed(2),
      'Total Running Costs': item.totalCosts.toFixed(2),
      'Total Revenues': item.totalRevenues.toFixed(2),
      'Net Profit': item.netProfit.toFixed(2),
      'ROI %': `${item.roiPercentage.toFixed(2)}%`,
    }));
    exportToCSV(`TransitOps_ROI_Report_${new Date().toISOString().split('T')[0]}.csv`, csvData);
  };

  const handleExportPDF = () => {
    exportToPDF(simReportData, {
      netProfit: totalFleetProfit,
      costs: totalFleetCosts,
      revenues: totalFleetRevenue,
      roi: avgFleetROI,
      fuel: simReportData.reduce((sum, i) => sum + i.fuelCost, 0),
      maintenance: simReportData.reduce((sum, i) => sum + i.maintenanceCost, 0),
      other: simReportData.reduce((sum, i) => sum + i.otherExpenses, 0),
    }, formatCurrency);
  };

  return (
    <div className="space-y-5 font-normal">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl tracking-tight font-medium">Financial reports &amp; ROI</h2>
          <p className="text-sm text-muted-foreground">
            Export fleet profit metrics and model scenario parameters
          </p>
        </div>
        {canAccess('reports', 'export') && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="font-normal gap-1.5" onClick={handleExportPDF}>
              <Download className="h-4 w-4" /> Export PDF
            </Button>
            <Button size="sm" className="font-normal gap-1.5" onClick={handleExportCSV}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sliders className="h-4 w-4" /> What-if cost sensitivity
          </CardTitle>
          <CardDescription className="font-normal">
            Model fuel rate and shop labor fluctuations
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Fuel price variance</span>
              <span className="tabular-nums">
                {fuelSlider > 0 ? `+${fuelSlider}%` : `${fuelSlider}%`}
              </span>
            </div>
            <Slider
              value={[fuelSlider]}
              min={-20}
              max={50}
              step={1}
              onValueChange={(v) => setFuelSlider(Array.isArray(v) ? v[0] : v)}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>-20%</span>
              <span>Baseline</span>
              <span>+50%</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Maintenance cost variance</span>
              <span className="tabular-nums">
                {maintenanceSlider > 0 ? `+${maintenanceSlider}%` : `${maintenanceSlider}%`}
              </span>
            </div>
            <Slider
              value={[maintenanceSlider]}
              min={0}
              max={50}
              step={1}
              onValueChange={(v) => setMaintenanceSlider(Array.isArray(v) ? v[0] : v)}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>0%</span>
              <span>+50%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-5 text-center space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
              Simulated net profit
            </span>
            <span
              className={`text-2xl tabular-nums font-medium block ${
                totalFleetProfit >= 0 ? 'text-emerald-500' : 'text-destructive'
              }`}
            >
              {formatCurrency(totalFleetProfit)}
            </span>
            <span className="text-[11px] text-muted-foreground">
              Revenues: {formatCurrency(totalFleetRevenue)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
              Simulated fleet costs
            </span>
            <span className="text-2xl tabular-nums font-medium block">
              {formatCurrency(totalFleetCosts)}
            </span>
            <span className="text-[11px] text-muted-foreground">Includes slider adjustments</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
              Average fleet ROI
            </span>
            <span
              className={`text-2xl tabular-nums font-medium block ${
                avgFleetROI >= 0 ? 'text-foreground' : 'text-destructive'
              }`}
            >
              {avgFleetROI.toFixed(2)}%
            </span>
            <span className="text-[11px] text-muted-foreground">Returns against acquisition</span>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
        </div>
      ) : (
        <Card className="overflow-hidden">
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-medium">Vehicle ledger performance</CardTitle>
              <CardDescription className="font-normal">
                Trip revenue rate {formatCurrency(4.00)} / km
              </CardDescription>
            </div>
            <Badge variant="secondary" className="font-normal">
              {simReportData.length} units
            </Badge>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-normal">Vehicle</TableHead>
                    <TableHead className="font-normal text-right">Fuel</TableHead>
                    <TableHead className="font-normal text-right">Service</TableHead>
                    <TableHead className="font-normal text-right">Tolls</TableHead>
                    <TableHead className="font-normal text-right">Total</TableHead>
                    <TableHead className="font-normal text-right">Revenue</TableHead>
                    <TableHead className="font-normal text-right">Net profit</TableHead>
                    <TableHead className="font-normal text-right">Efficiency</TableHead>
                    <TableHead className="font-normal text-right">ROI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {simReportData.map((item) => (
                    <TableRow key={item.vehicleId}>
                      <TableCell>
                        <div className="font-medium text-sm">{item.registrationNumber}</div>
                        <div className="text-[11px] text-muted-foreground font-normal">
                          {item.model}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-normal">
                        {formatCurrency(item.fuelCost)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-normal">
                        {formatCurrency(item.maintenanceCost)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-normal">
                        {formatCurrency(item.otherExpenses)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-normal">
                        {formatCurrency(item.totalCosts)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-normal">
                        {formatCurrency(item.totalRevenues)}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums font-normal ${
                          item.netProfit >= 0 ? 'text-emerald-500' : 'text-destructive'
                        }`}
                      >
                        {formatCurrency(item.netProfit)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-normal">
                        {item.fuelEfficiency > 0 ? `${item.fuelEfficiency} km/L` : '—'}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums font-normal ${
                          item.roiPercentage >= 0 ? '' : 'text-destructive'
                        }`}
                      >
                        {item.roiPercentage.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
