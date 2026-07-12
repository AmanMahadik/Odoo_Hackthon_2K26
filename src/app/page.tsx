'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { db } from '@/lib/db';
import { useRole } from '@/lib/roleContext';
import { Vehicle, Driver, Trip, MaintenanceLog, MaintenancePrediction, mockDrivers } from '@/lib/mockData';
import { 
  TrendingUp, 
  Truck, 
  Users, 
  Wrench, 
  ArrowRight,
  ShieldCheck,
  Database,
  MapPin,
  Monitor
} from 'lucide-react';
import AIPredictionCard from '@/components/ai/AIPredictionCard';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Cell } from 'recharts';
import { Badge } from '@/components/ui/badge';

// Dynamically import map with no SSR since Leaflet needs window
const LiveFleetMap = dynamic(() => import('@/components/maps/LiveFleetMap'), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-muted border border-border animate-pulse flex items-center justify-center rounded-md">
      <p className="text-muted-foreground font-medium">Loading Live Telematics...</p>
    </div>
  )
});

const mockPrediction: MaintenancePrediction = {
  component: 'Transmission System',
  health: 42,
  urgency: 'high',
  predictedFailureDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  predictedFailureKm: 4200,
  recommendedAction: 'Schedule transmission fluid flush and gear inspection before next long-haul route.',
  riskAssessment: 'High probability of on-route breakdown if ignored.',
  estimatedCost: { current: 450, delayed: 3200, savings: 2750 },
  optimalServiceWindow: { start: 'This Friday', end: 'Sunday', reason: 'Matches predicted vehicle downtime.' },
  economicInsight: 'Immediate repair saves 85% compared to on-route failure and towing.'
};

export default function Dashboard() {
  const { role } = useRole();
  const [dbMode, setDbMode] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
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

  // Fleet Command Graph Logic
  const highRiskDrivers = mockDrivers.filter(d => d.safety_score < 75);
  const excellentDrivers = mockDrivers.filter(d => d.safety_score >= 90);
  const scoreDistribution = [
    { name: '90-100 (Excellent)', count: excellentDrivers.length, fill: "hsl(var(--primary))" },
    { name: '75-89 (Average)', count: mockDrivers.length - highRiskDrivers.length - excellentDrivers.length, fill: "hsl(var(--muted-foreground))" },
    { name: '<75 (High Risk)', count: highRiskDrivers.length, fill: "hsl(var(--destructive))" },
  ];

  // Safety Officer Alerts: license expiring in 30 days
  const expiringLicenses = drivers.filter(d => {
    const expiry = new Date(d.license_expiry_date);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  });

  const inShopVehicles = vehicles.filter(v => v.status === 'In Shop');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fleet Utilization</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{utilizationRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">of active fleet</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Fleet Size</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVehicles}</div>
            <p className="text-xs text-muted-foreground mt-1">{activeVehiclesOnTrip} dispatched</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drivers On Duty</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDrivers}</div>
            <p className="text-xs text-muted-foreground mt-1">{activeDriversOnTrip} on trip</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Repairs</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openMaintenanceCount}</div>
            <p className="text-xs text-muted-foreground mt-1">pending shop</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Interactive Map, AI Prediction, Safety Chart, & Right Panel Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core Operations & Fleet Command */}
        <div className="lg:col-span-2 space-y-6">
          
          <Card className="flex flex-col justify-between">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-md">Live Fleet Telematics</CardTitle>
                  <CardDescription>Real-time coordinates broadcast</CardDescription>
                </div>
                <span className="px-2.5 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping"></span>
                  Active Live Stream
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {/* Embedded Live Map Component */}
              <div className="h-96 w-full rounded-md overflow-hidden border border-border relative">
                <LiveFleetMap compact />
              </div>
              <div className="mt-6 flex gap-4">
                <Link href="/trips" className={`flex-1 ${buttonVariants({ variant: "default" })}`}>
                  Go to Trip Board <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
                <Link href="/reports" className={`flex-1 ${buttonVariants({ variant: "outline" })}`}>
                  Analyze ROI Metrics
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* AI Prediction Widget */}
          <AIPredictionCard prediction={mockPrediction} vehicleReg="FLEET-T800" />

          {/* Fleet Command Graph Shifted Here */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Monitor className="h-5 w-5" /> Safety Command Distribution
              </CardTitle>
              <CardDescription>Driver behavioral scores based on telematics & AI analytics.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ChartContainer config={{
                  count: { label: "Drivers" },
                  excellent: { color: "hsl(var(--primary))" },
                  average: { color: "hsl(var(--muted-foreground))" },
                  risk: { color: "hsl(var(--destructive))" }
                }} className="h-full w-full">
                  <BarChart data={scoreDistribution} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} style={{ fontSize: '12px', fill: 'hsl(var(--foreground))', fontWeight: 500 }} width={120} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {scoreDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Sidebar Alerts / Role Information */}
        <div className="space-y-6">
          {/* Quick Actions Panel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Operations Panel</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Link href="/vehicles?add=true" className={buttonVariants({ variant: "outline", size: "sm" })}>Add Vehicle</Link>
              <Link href="/drivers?add=true" className={buttonVariants({ variant: "outline", size: "sm" })}>Add Driver</Link>
              <Link href="/trips?new=true" className={`col-span-2 ${buttonVariants({ variant: "default", size: "sm" })}`}>Dispatch New Route</Link>
            </CardContent>
          </Card>

          {/* Role Differentiated Insights */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-bold">{role} Insights</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {role === 'Fleet Manager' && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">In-Shop Diagnostics</span>
                  {inShopVehicles.length > 0 ? (
                    inShopVehicles.map(v => (
                      <div key={v.id} className="p-2 border border-border rounded-md flex items-center justify-between text-sm">
                        <div>
                          <span className="font-semibold block">{v.registration_number}</span>
                          <span className="text-[10px] text-muted-foreground">{v.model}</span>
                        </div>
                        <Badge variant="destructive" className="text-[9px]">In Shop</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground font-medium">All vehicles available. No active shop holds.</p>
                  )}
                </div>
              )}

              {role === 'Safety Officer' && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">License Compliance</span>
                  {expiringLicenses.length > 0 ? (
                    expiringLicenses.map(d => {
                      const expiry = new Date(d.license_expiry_date);
                      const today = new Date();
                      const diffTime = expiry.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      return (
                        <div key={d.id} className="p-2 border border-border rounded-md flex items-center justify-between text-sm">
                          <div>
                            <span className="font-semibold block">{d.name}</span>
                            <span className="text-[10px] text-muted-foreground">Expiry: {d.license_expiry_date}</span>
                          </div>
                          <Badge variant="secondary" className="text-[9px]">{diffDays} days left</Badge>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-muted-foreground font-medium">All drivers comply with safety registry regulations.</p>
                  )}
                </div>
              )}

              {role === 'Financial Analyst' && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Expense Indicators</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 border border-border rounded-md">
                      <span className="text-[9px] text-muted-foreground font-bold block uppercase">Fuel Costs</span>
                      <span className="text-sm font-bold">$335.00</span>
                    </div>
                    <div className="p-2 border border-border rounded-md">
                      <span className="text-[9px] text-muted-foreground font-bold block uppercase">Repair Costs</span>
                      <span className="text-sm font-bold">$450.00</span>
                    </div>
                  </div>
                </div>
              )}

              {role === 'Dispatcher' && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Operational Board Alerts</span>
                  <div className="p-2 border border-border rounded-md flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold block">Dispatched Active</span>
                      <span className="text-[10px] text-muted-foreground">Trips dispatching:</span>
                    </div>
                    <Badge variant="default" className="text-[9px]">{activeTrips} Routes</Badge>
                  </div>
                </div>
              )}

              {role === 'Driver' && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Assigned Logs</span>
                  <div className="p-2 border border-border rounded-md">
                    <span className="text-xs font-bold block">Next Pickup</span>
                    <span className="text-[10px] text-muted-foreground block">Check scheduled routes inside the Trip Board.</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
