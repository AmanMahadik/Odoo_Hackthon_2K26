'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { db } from '@/lib/db';
import { useRole } from '@/lib/roleContext';
import { Vehicle, Driver, Trip, MaintenanceLog, MaintenancePrediction, mockDrivers } from '@/lib/mockData';
import { gpsService } from '@/lib/mockServices';
import {
  TrendingUp,
  Truck,
  Users,
  Wrench,
  ArrowRight,
  ShieldCheck,
  Navigation,
  Fuel,
  Activity,
  Radio,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  CircleDot,
} from 'lucide-react';
import AIPredictionCard from '@/components/ai/AIPredictionCard';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Cell } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Progress, ProgressTrack, ProgressIndicator } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const LiveFleetMap = dynamic(() => import('@/components/maps/LiveFleetMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-muted border border-border animate-pulse flex items-center justify-center rounded-md">
      <p className="text-muted-foreground font-medium">Loading Live Telematics...</p>
    </div>
  ),
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
  economicInsight: 'Immediate repair saves 85% compared to on-route failure and towing.',
};

export default function Dashboard() {
  const { role, canAccess } = useRole();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [livePositions, setLivePositions] = useState<Record<string, any>>({});
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [regionFilter, setRegionFilter] = useState<string>('All');
  const [activityFeed, setActivityFeed] = useState<
    { id: string; text: string; time: string; type: 'trip' | 'maint' | 'fuel' | 'alert' }[]
  >([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [v, d, t, m] = await Promise.all([
          db.getVehicles(),
          db.getDrivers(),
          db.getTrips(),
          db.getMaintenanceLogs(),
        ]);
        setVehicles(v);
        setDrivers(d);
        setTrips(t);
        setMaintenance(m);

        const feed = [
          ...t
            .filter((x) => x.status === 'Dispatched')
            .slice(0, 3)
            .map((x) => ({
              id: `trip-${x.id}`,
              text: `Trip #${x.trip_number}: ${x.source} → ${x.destination}`,
              time: 'Live',
              type: 'trip' as const,
            })),
          ...m
            .filter((x) => x.status === 'Open')
            .slice(0, 2)
            .map((x) => ({
              id: `m-${x.id}`,
              text: `Shop open: ${x.description.slice(0, 48)}…`,
              time: 'Open',
              type: 'maint' as const,
            })),
          {
            id: 'alert-1',
            text: 'License expiry watchlist refreshed for Safety Officer',
            time: '2m ago',
            type: 'alert' as const,
          },
        ];
        setActivityFeed(feed);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Poll live positions for sidebar chips
  useEffect(() => {
    const tick = () => setLivePositions(gpsService.getLiveFleetState().positions);
    tick();
    const id = setInterval(tick, 2500);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  // Region tags for demo fleet (hackathon filter by region)
  const vehicleRegion: Record<string, string> = {
    v1: 'West', v2: 'West', v3: 'West', v4: 'West', v5: 'North',
    v6: 'North', v7: 'South', v8: 'South', v9: 'East', v10: 'East',
    v11: 'West', v12: 'North',
  };

  const scoped = vehicles.filter((v) => {
    if (typeFilter !== 'All' && v.type !== typeFilter) return false;
    if (statusFilter !== 'All' && v.status !== statusFilter) return false;
    if (regionFilter !== 'All' && (vehicleRegion[v.id] || 'West') !== regionFilter) return false;
    return true;
  });

  const totalVehicles = scoped.filter((v) => v.status !== 'Retired').length;
  const onTripVehicles = scoped.filter((v) => v.status === 'On Trip');
  const availableVehicles = scoped.filter((v) => v.status === 'Available');
  const inShopVehicles = scoped.filter((v) => v.status === 'In Shop');
  const activeTrips = trips.filter((t) => t.status === 'Dispatched');
  const draftTrips = trips.filter((t) => t.status === 'Draft');
  const openMaintenance = maintenance.filter((m) => m.status === 'Open');
  const activeDrivers = drivers.filter((d) => d.status === 'On Trip');
  const utilizationRate =
    totalVehicles > 0 ? Math.round((onTripVehicles.length / totalVehicles) * 100) : 0;

  const highRiskDrivers = mockDrivers.filter((d) => d.safety_score < 75);
  const excellentDrivers = mockDrivers.filter((d) => d.safety_score >= 90);
  const scoreDistribution = [
    { name: '90-100 Excellent', count: excellentDrivers.length, fill: '#10b981' },
    {
      name: '75-89 Average',
      count: mockDrivers.length - highRiskDrivers.length - excellentDrivers.length,
      fill: '#f59e0b',
    },
    { name: '<75 High Risk', count: highRiskDrivers.length, fill: '#ef4444' },
  ];

  const expiringLicenses = drivers.filter((d) => {
    const expiry = new Date(d.license_expiry_date);
    const diffDays = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  });

  // Hackathon KPI set (3.2 Dashboard)
  const segmentCards = [
    {
      title: 'Active Vehicles',
      value: onTripVehicles.length,
      subtitle: 'Currently On Trip',
      icon: Radio,
      href: '/vehicles',
      accent: 'text-emerald-500 bg-emerald-500/10',
      roles: ['Fleet Manager', 'Driver', 'Dispatcher', 'Safety Officer', 'Financial Analyst', 'Maintenance Technician'] as const,
    },
    {
      title: 'Available Vehicles',
      value: availableVehicles.length,
      subtitle: 'Ready for dispatch',
      icon: Truck,
      href: '/vehicles',
      accent: 'text-sky-500 bg-sky-500/10',
      roles: ['Fleet Manager', 'Driver', 'Dispatcher', 'Safety Officer', 'Maintenance Technician'] as const,
    },
    {
      title: 'In Maintenance',
      value: inShopVehicles.length,
      subtitle: `${openMaintenance.length} open logs`,
      icon: Wrench,
      href: '/maintenance',
      accent: 'text-orange-500 bg-orange-500/10',
      roles: ['Fleet Manager', 'Driver', 'Safety Officer', 'Maintenance Technician'] as const,
    },
    {
      title: 'Active Trips',
      value: activeTrips.length,
      subtitle: 'Dispatched deliveries',
      icon: Navigation,
      href: '/trips',
      accent: 'text-blue-500 bg-blue-500/10',
      roles: ['Fleet Manager', 'Driver', 'Dispatcher'] as const,
    },
    {
      title: 'Pending Trips',
      value: draftTrips.length,
      subtitle: 'Draft awaiting dispatch',
      icon: Clock,
      href: '/trips',
      accent: 'text-amber-500 bg-amber-500/10',
      roles: ['Fleet Manager', 'Driver', 'Dispatcher'] as const,
    },
    {
      title: 'Drivers On Duty',
      value: activeDrivers.length,
      subtitle: `${drivers.length} in roster`,
      icon: Users,
      href: '/drivers',
      accent: 'text-indigo-500 bg-indigo-500/10',
      roles: ['Fleet Manager', 'Driver', 'Dispatcher', 'Safety Officer'] as const,
    },
    {
      title: 'Fleet Utilization',
      value: `${utilizationRate}%`,
      subtitle: `${onTripVehicles.length}/${totalVehicles} of active fleet`,
      icon: TrendingUp,
      href: '/reports',
      accent: 'text-purple-500 bg-purple-500/10',
      roles: ['Fleet Manager', 'Financial Analyst'] as const,
    },
    {
      title: 'Fuel & Costs',
      value: 'Ledger',
      subtitle: 'Fuel + expense tracking',
      icon: Fuel,
      href: '/fuel-expenses',
      accent: 'text-teal-500 bg-teal-500/10',
      roles: ['Fleet Manager', 'Driver', 'Financial Analyst'] as const,
    },
  ].filter((c) => (c.roles as readonly string[]).includes(role));

  const liveList = Object.entries(livePositions)
    .map(([id, pos]) => {
      const info = gpsService.getDriverForVehicle(id);
      return { id, pos, vehicle: info?.vehicle, driver: info?.driver };
    })
    .filter((x) => x.vehicle)
    .sort((a, b) => (b.pos.speed || 0) - (a.pos.speed || 0));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Welcome strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Operations Command
          </p>
          <h2 className="text-lg font-bold tracking-tight">
            {role} overview · real-time fleet pulse
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Telematics live
          </Badge>
          {canAccess('trips', 'create') && (
            <Link href="/trips?new=true" className={buttonVariants({ size: 'sm' })}>
              Dispatch route
            </Link>
          )}
        </div>
      </div>

      {/* Filters: type / status / region (3.2) */}
      <Card>
        <CardContent className="pt-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
            Filters
          </span>
          <Select value={typeFilter} onValueChange={(v) => v && setTypeFilter(v)}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Vehicle type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All types</SelectItem>
              <SelectItem value="Van">Van</SelectItem>
              <SelectItem value="Truck">Truck</SelectItem>
              <SelectItem value="Bus">Bus</SelectItem>
              <SelectItem value="Car">Car</SelectItem>
              <SelectItem value="Bike">Bike</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All statuses</SelectItem>
              <SelectItem value="Available">Available</SelectItem>
              <SelectItem value="On Trip">On Trip</SelectItem>
              <SelectItem value="In Shop">In Shop</SelectItem>
              <SelectItem value="Retired">Retired</SelectItem>
            </SelectContent>
          </Select>
          <Select value={regionFilter} onValueChange={(v) => v && setRegionFilter(v)}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All regions</SelectItem>
              <SelectItem value="West">West</SelectItem>
              <SelectItem value="North">North</SelectItem>
              <SelectItem value="South">South</SelectItem>
              <SelectItem value="East">East</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="sm:ml-auto">
            {scoped.length} vehicles in scope
          </Badge>
        </CardContent>
      </Card>

      {/* Segment KPI boxes — role-filtered */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {segmentCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.title} href={card.href} className="group">
              <Card className="h-full transition-all hover:shadow-md hover:ring-primary/20 group-hover:-translate-y-0.5">
                <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <div className={`p-1.5 rounded-md ${card.accent}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tracking-tight">{card.value}</div>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{card.subtitle}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Map + Live fleet side panel */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Live routes & status
                  </CardTitle>
                  <CardDescription>
                    Vehicles move along active corridors · click a unit for details
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                  {onTripVehicles.length} en route
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[420px] w-full rounded-md overflow-hidden border border-border relative">
                <LiveFleetMap
                  compact
                  showRoutes
                  selectedVehicleId={selectedVehicleId}
                  onSelectVehicle={setSelectedVehicleId}
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {canAccess('trips', 'read') && (
                  <Link href="/trips" className={buttonVariants({ variant: 'default' })}>
                    Trip board <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                )}
                {role === 'Fleet Manager' && (
                  <Link href="/fleet-command" className={buttonVariants({ variant: 'outline' })}>
                    Fleet command
                  </Link>
                )}
                {canAccess('reports', 'read') && (
                  <Link href="/reports" className={buttonVariants({ variant: 'outline' })}>
                    ROI metrics
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          <AIPredictionCard prediction={mockPrediction} vehicleReg="FLEET-T800" />

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-5 w-5" /> Safety score distribution
              </CardTitle>
              <CardDescription>Driver behavioral scores from telematics analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
                <ChartContainer
                  config={{
                    count: { label: 'Drivers' },
                  }}
                  className="h-full w-full"
                >
                  <BarChart
                    data={scoreDistribution}
                    layout="vertical"
                    margin={{ left: 10, right: 30, top: 10, bottom: 10 }}
                  >
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      style={{ fontSize: '12px', fill: 'currentColor', fontWeight: 500 }}
                      width={120}
                    />
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

        {/* Right column */}
        <div className="space-y-4">
          {/* Live vehicle status list */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Truck className="h-4 w-4" /> Live vehicle status
              </CardTitle>
              <CardDescription>Tap to focus on map</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {liveList.slice(0, 8).map(({ id, pos, vehicle, driver }) => {
                const moving = (pos.speed || 0) > 3;
                const selected = selectedVehicleId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedVehicleId(id === selectedVehicleId ? null : id)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                      selected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">
                          {vehicle?.registration_number}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {driver?.name || '—'} · {pos.destination || vehicle?.status}
                        </div>
                      </div>
                      <Badge
                        variant={moving ? 'default' : 'secondary'}
                        className="text-[9px] shrink-0"
                      >
                        {moving ? `${Math.round(pos.speed)} km/h` : vehicle?.status}
                      </Badge>
                    </div>
                    {moving && typeof pos.progress === 'number' && (
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-[9px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> ETA {pos.eta_minutes}m
                          </span>
                          <span>{Math.round(pos.progress * 100)}% route</span>
                        </div>
                        <Progress value={pos.progress * 100}>
                          <ProgressTrack className="h-1">
                            <ProgressIndicator className="bg-emerald-500" />
                          </ProgressTrack>
                        </Progress>
                      </div>
                    )}
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Active trips — only for roles that can access trips */}
          {canAccess('trips', 'read') && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Navigation className="h-4 w-4" /> Dispatched trips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {activeTrips.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No active dispatches.</p>
                ) : (
                  activeTrips.slice(0, 4).map((t) => (
                    <div
                      key={t.id}
                      className="p-2.5 border border-border rounded-lg flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold">#{t.trip_number}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {t.source} → {t.destination}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {t.cargo_weight} kg · {t.planned_distance} km
                        </div>
                      </div>
                      <Badge className="text-[9px] shrink-0 gap-1">
                        <CircleDot className="h-3 w-3" /> Live
                      </Badge>
                    </div>
                  ))
                )}
                <Link
                  href="/trips"
                  className={`w-full ${buttonVariants({ variant: 'outline', size: 'sm' })}`}
                >
                  Open trip board
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Activity feed */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Activity className="h-4 w-4" /> Live activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {activityFeed.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2 p-2 rounded-md border border-border/60"
                >
                  {item.type === 'trip' && <Navigation className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />}
                  {item.type === 'maint' && <Wrench className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0" />}
                  {item.type === 'alert' && (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                  )}
                  {item.type === 'fuel' && <Fuel className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] leading-snug">{item.text}</p>
                    <span className="text-[9px] text-muted-foreground">{item.time}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Role insights */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-bold">{role} insights</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {role === 'Fleet Manager' && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    In-shop units
                  </span>
                  {inShopVehicles.length > 0 ? (
                    inShopVehicles.map((v) => (
                      <div
                        key={v.id}
                        className="p-2 border border-border rounded-md flex items-center justify-between text-sm"
                      >
                        <div>
                          <span className="font-semibold block">{v.registration_number}</span>
                          <span className="text-[10px] text-muted-foreground">{v.model}</span>
                        </div>
                        <Badge variant="destructive" className="text-[9px]">
                          In Shop
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">All vehicles available.</p>
                  )}
                </div>
              )}

              {role === 'Safety Officer' && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    License compliance
                  </span>
                  {expiringLicenses.length > 0 ? (
                    expiringLicenses.map((d) => {
                      const diffDays = Math.ceil(
                        (new Date(d.license_expiry_date).getTime() - Date.now()) /
                          (1000 * 60 * 60 * 24)
                      );
                      return (
                        <div
                          key={d.id}
                          className="p-2 border border-border rounded-md flex items-center justify-between text-sm"
                        >
                          <div>
                            <span className="font-semibold block">{d.name}</span>
                            <span className="text-[10px] text-muted-foreground">
                              Expiry: {d.license_expiry_date}
                            </span>
                          </div>
                          <Badge variant="secondary" className="text-[9px]">
                            {diffDays}d left
                          </Badge>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> All licenses OK
                    </p>
                  )}
                </div>
              )}

              {(role === 'Driver' || role === 'Dispatcher') && (
                <div className="space-y-2">
                  <div className="p-2 border border-border rounded-md flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold block">Dispatched active</span>
                      <span className="text-[10px] text-muted-foreground">Routes on the road</span>
                    </div>
                    <Badge>{activeTrips.length}</Badge>
                  </div>
                  <div className="p-2 border border-border rounded-md flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold block">Draft trips</span>
                      <span className="text-[10px] text-muted-foreground">Awaiting dispatch</span>
                    </div>
                    <Badge variant="secondary">{draftTrips.length}</Badge>
                  </div>
                  <Link
                    href="/trips?new=true"
                    className={`${buttonVariants({ size: 'sm' })} w-full`}
                  >
                    Create / dispatch trip
                  </Link>
                </div>
              )}

              {role === 'Maintenance Technician' && (
                <div className="space-y-2">
                  {openMaintenance.slice(0, 3).map((log) => (
                    <div key={log.id} className="p-2 border border-border rounded-md text-xs">
                      <div className="font-semibold">{log.vehicle?.registration_number || 'Unit'}</div>
                      <div className="text-muted-foreground text-[10px] line-clamp-2">{log.description}</div>
                    </div>
                  ))}
                  <Link href="/maintenance" className={`${buttonVariants({ size: 'sm', variant: 'outline' })} w-full`}>
                    Open shop board
                  </Link>
                </div>
              )}

              {role === 'Financial Analyst' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 border border-border rounded-md">
                    <span className="text-[9px] text-muted-foreground font-bold block uppercase">
                      Open repairs
                    </span>
                    <span className="text-sm font-bold">{openMaintenance.length}</span>
                  </div>
                  <div className="p-2 border border-border rounded-md">
                    <span className="text-[9px] text-muted-foreground font-bold block uppercase">
                      Utilization
                    </span>
                    <span className="text-sm font-bold">{utilizationRate}%</span>
                  </div>
                  <Link
                    href="/reports"
                    className={`col-span-2 ${buttonVariants({ size: 'sm', variant: 'outline' })}`}
                  >
                    Open ROI reports
                  </Link>
                </div>
              )}

              {role === 'Fleet Manager' && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link
                    href="/vehicles?add=true"
                    className={buttonVariants({ variant: 'outline', size: 'sm' })}
                  >
                    Add vehicle
                  </Link>
                  <Link
                    href="/drivers?add=true"
                    className={buttonVariants({ variant: 'outline', size: 'sm' })}
                  >
                    Add driver
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
