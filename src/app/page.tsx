'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { db } from '@/lib/db';
import { useRole } from '@/lib/roleContext';
import {
  Vehicle,
  Driver,
  Trip,
  MaintenanceLog,
  MaintenancePrediction,
  mockDrivers,
} from '@/lib/mockData';
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
  Filter,
  Newspaper,
  BarChart3,
  Sparkles,
  X,
} from 'lucide-react';
import AIPredictionCard from '@/components/ai/AIPredictionCard';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Cell } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Progress, ProgressTrack, ProgressIndicator } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

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
  recommendedAction:
    'Schedule transmission fluid flush and gear inspection before next long-haul route.',
  riskAssessment: 'High probability of on-route breakdown if ignored.',
  estimatedCost: { current: 450, delayed: 3200, savings: 2750 },
  optimalServiceWindow: {
    start: 'This Friday',
    end: 'Sunday',
    reason: 'Matches predicted vehicle downtime.',
  },
  economicInsight: 'Immediate repair saves 85% compared to on-route failure and towing.',
};

type FeedItem = {
  id: string;
  text: string;
  time: string;
  type: 'trip' | 'maint' | 'fuel' | 'alert' | 'news';
  href: string;
  ts: number;
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
  const [vehicleOrder, setVehicleOrder] = useState<string[]>([]);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const prevPosRef = useRef<Record<string, { lat: number; lng: number; speed: number }>>({});

  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [regionFilter, setRegionFilter] = useState('All');
  const [filterOpen, setFilterOpen] = useState(false);
  // Draft filters inside modal
  const [draftType, setDraftType] = useState('All');
  const [draftStatus, setDraftStatus] = useState('All');
  const [draftRegion, setDraftRegion] = useState('All');

  const [activityFeed, setActivityFeed] = useState<FeedItem[]>([]);

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

        const now = Date.now();
        const feed: FeedItem[] = [
          ...t
            .filter((x) => x.status === 'Dispatched')
            .slice(0, 4)
            .map((x, i) => ({
              id: `trip-${x.id}`,
              text: `Live trip #${x.trip_number}: ${x.source} → ${x.destination}`,
              time: 'Live',
              type: 'trip' as const,
              href: '/trips',
              ts: now - i * 1000,
            })),
          ...t
            .filter((x) => x.status === 'Draft')
            .slice(0, 2)
            .map((x, i) => ({
              id: `draft-${x.id}`,
              text: `New draft #${x.trip_number} waiting dispatch`,
              time: 'Pending',
              type: 'trip' as const,
              href: '/trips?new=true',
              ts: now - 5000 - i * 1000,
            })),
          ...m
            .filter((x) => x.status === 'Open')
            .slice(0, 3)
            .map((x, i) => ({
              id: `m-${x.id}`,
              text: `Maintenance: ${x.description.slice(0, 52)}${x.description.length > 52 ? '…' : ''}`,
              time: 'Open',
              type: 'maint' as const,
              href: '/maintenance',
              ts: now - 8000 - i * 1000,
            })),
          {
            id: 'fuel-1',
            text: 'Fuel desk: review recent fill-ups & expense ledger',
            time: '5m ago',
            type: 'fuel' as const,
            href: '/fuel-expenses',
            ts: now - 12000,
          },
          {
            id: 'news-1',
            text: 'Ops bulletin: wet-season brake inspections recommended fleet-wide',
            time: '1h ago',
            type: 'news' as const,
            href: '/ai-predictions',
            ts: now - 20000,
          },
          {
            id: 'alert-1',
            text: 'License expiry watchlist refreshed for Safety Officer',
            time: '2m ago',
            type: 'alert' as const,
            href: '/safety-command',
            ts: now - 3000,
          },
        ].sort((a, b) => b.ts - a.ts);

        setActivityFeed(feed);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Live positions + bubble updated vehicles to top
  useEffect(() => {
    const tick = () => {
      const state = gpsService.getLiveFleetState();
      const positions = state.positions;
      setLivePositions(positions);

      const prev = prevPosRef.current;
      const updated: string[] = [];

      for (const [id, pos] of Object.entries(positions)) {
        const p = prev[id];
        if (!p) {
          updated.push(id);
          continue;
        }
        const moved =
          Math.abs(p.lat - pos.lat) > 0.00015 ||
          Math.abs(p.lng - pos.lng) > 0.00015 ||
          Math.abs(p.speed - pos.speed) > 3;
        if (moved) updated.push(id);
      }

      prevPosRef.current = Object.fromEntries(
        Object.entries(positions).map(([id, pos]) => [
          id,
          { lat: pos.lat, lng: pos.lng, speed: pos.speed },
        ])
      );

      setVehicleOrder((order) => {
        const ids = Object.keys(positions);
        let next = order.filter((id) => ids.includes(id));
        for (const id of ids) {
          if (!next.includes(id)) next.push(id);
        }
        // Bubble latest updates to front
        if (updated.length) {
          const bump = updated.filter((id) => next.includes(id));
          next = [...bump, ...next.filter((id) => !bump.includes(id))];
          setFlashIds(new Set(bump));
          setTimeout(() => setFlashIds(new Set()), 1200);
        }
        return next;
      });
    };

    tick();
    const id = setInterval(tick, 2500);
    return () => clearInterval(id);
  }, []);

  // Simulate activity feed bubbling every ~8s
  useEffect(() => {
    const samples = [
      {
        text: 'Telematics ping: TRK-12 speed change +8 km/h',
        type: 'trip' as const,
        href: '/trips',
      },
      {
        text: 'Fuel request logged for VAN-05 — review cost',
        type: 'fuel' as const,
        href: '/fuel-expenses',
      },
      {
        text: 'Shop queue: new diagnostic ticket opened',
        type: 'maint' as const,
        href: '/maintenance',
      },
      {
        text: 'News: corridor congestion near Airport Cargo Hub',
        type: 'news' as const,
        href: '/trips',
      },
      {
        text: 'Safety: score recalculated for 2 drivers',
        type: 'alert' as const,
        href: '/safety-command',
      },
    ];
    const id = setInterval(() => {
      const pick = samples[Math.floor(Math.random() * samples.length)];
      setActivityFeed((prev) => {
        const item: FeedItem = {
          id: `live-${Date.now()}`,
          text: pick.text,
          time: 'Just now',
          type: pick.type,
          href: pick.href,
          ts: Date.now(),
        };
        return [item, ...prev].slice(0, 12);
      });
    }, 8000);
    return () => clearInterval(id);
  }, []);

  const vehicleRegion: Record<string, string> = {
    v1: 'West',
    v2: 'West',
    v3: 'West',
    v4: 'West',
    v5: 'North',
    v6: 'North',
    v7: 'South',
    v8: 'South',
    v9: 'East',
    v10: 'East',
    v11: 'West',
    v12: 'North',
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

  const activeFilterCount = [typeFilter, statusFilter, regionFilter].filter(
    (f) => f !== 'All'
  ).length;

  const openFilterModal = () => {
    setDraftType(typeFilter);
    setDraftStatus(statusFilter);
    setDraftRegion(regionFilter);
    setFilterOpen(true);
  };

  const applyFilters = () => {
    setTypeFilter(draftType);
    setStatusFilter(draftStatus);
    setRegionFilter(draftRegion);
    setFilterOpen(false);
  };

  const clearFilters = () => {
    setDraftType('All');
    setDraftStatus('All');
    setDraftRegion('All');
    setTypeFilter('All');
    setStatusFilter('All');
    setRegionFilter('All');
    setFilterOpen(false);
  };

  const liveList = useMemo(() => {
    const byId = Object.entries(livePositions).map(([id, pos]) => {
      const info = gpsService.getDriverForVehicle(id);
      return { id, pos, vehicle: info?.vehicle, driver: info?.driver };
    });
    const map = new Map(byId.map((x) => [x.id, x]));
    const ordered = vehicleOrder
      .map((id) => map.get(id))
      .filter(Boolean) as typeof byId;
    // append any missing
    for (const item of byId) {
      if (!vehicleOrder.includes(item.id)) ordered.push(item);
    }
    return ordered.filter((x) => x.vehicle).slice(0, 5);
  }, [livePositions, vehicleOrder]);

  const highRiskDrivers = mockDrivers.filter((d) => d.safety_score < 75);
  const excellentDrivers = mockDrivers.filter((d) => d.safety_score >= 90);
  const scoreDistribution = [
    { name: '90-100 Excellent', count: excellentDrivers.length, fill: 'hsl(var(--primary))' },
    {
      name: '75-89 Average',
      count: mockDrivers.length - highRiskDrivers.length - excellentDrivers.length,
      fill: 'hsl(var(--muted-foreground))',
    },
    { name: '<75 High Risk', count: highRiskDrivers.length, fill: 'hsl(var(--destructive))' },
  ];

  const expiringLicenses = drivers.filter((d) => {
    const expiry = new Date(d.license_expiry_date);
    const diffDays = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  });

  const segmentCards = [
    {
      title: 'Active Vehicles',
      value: onTripVehicles.length,
      subtitle: 'Currently On Trip',
      icon: Radio,
      href: '/vehicles',
      accent: 'text-emerald-500 bg-emerald-500/10',
      roles: [
        'Fleet Manager',
        'Driver',
        'Dispatcher',
        'Safety Officer',
        'Financial Analyst',
        'Maintenance Technician',
      ] as const,
    },
    {
      title: 'Available',
      value: availableVehicles.length,
      subtitle: 'Ready for dispatch',
      icon: Truck,
      href: '/vehicles',
      accent: 'text-sky-500 bg-sky-500/10',
      roles: [
        'Fleet Manager',
        'Driver',
        'Dispatcher',
        'Safety Officer',
        'Maintenance Technician',
      ] as const,
    },
    {
      title: 'In Shop',
      value: inShopVehicles.length,
      subtitle: `${openMaintenance.length} open logs`,
      icon: Wrench,
      href: '/maintenance',
      accent: 'text-orange-500 bg-orange-500/10',
      roles: ['Fleet Manager', 'Driver', 'Safety Officer', 'Maintenance Technician'] as const,
    },
    {
      title: 'Live Trips',
      value: activeTrips.length,
      subtitle: 'Dispatched now',
      icon: Navigation,
      href: '/trips',
      accent: 'text-blue-500 bg-blue-500/10',
      roles: ['Fleet Manager', 'Driver', 'Dispatcher'] as const,
    },
    {
      title: 'Pending',
      value: draftTrips.length,
      subtitle: 'Draft routes',
      icon: Clock,
      href: '/trips',
      accent: 'text-amber-500 bg-amber-500/10',
      roles: ['Fleet Manager', 'Driver', 'Dispatcher'] as const,
    },
    {
      title: 'On Duty',
      value: activeDrivers.length,
      subtitle: `${drivers.length} roster`,
      icon: Users,
      href: '/drivers',
      accent: 'text-indigo-500 bg-indigo-500/10',
      roles: ['Fleet Manager', 'Driver', 'Dispatcher', 'Safety Officer'] as const,
    },
    {
      title: 'Utilization',
      value: `${utilizationRate}%`,
      subtitle: 'Active fleet load',
      icon: TrendingUp,
      href: '/reports',
      accent: 'text-purple-500 bg-purple-500/10',
      roles: ['Fleet Manager', 'Financial Analyst'] as const,
    },
    {
      title: 'Fuel Desk',
      value: 'Open',
      subtitle: 'Logs & expenses',
      icon: Fuel,
      href: '/fuel-expenses',
      accent: 'text-teal-500 bg-teal-500/10',
      roles: ['Fleet Manager', 'Driver', 'Financial Analyst'] as const,
    },
  ].filter((c) => (c.roles as readonly string[]).includes(role));

  const newsItems = activityFeed.filter((a) => a.type === 'news' || a.type === 'alert');
  const tripFeed = activityFeed.filter((a) => a.type === 'trip');
  const maintFuelFeed = activityFeed.filter(
    (a) => a.type === 'maint' || a.type === 'fuel'
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  const feedIcon = (type: FeedItem['type']) => {
    if (type === 'trip') return <Navigation className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />;
    if (type === 'maint') return <Wrench className="h-3.5 w-3.5 text-orange-500 shrink-0 mt-0.5" />;
    if (type === 'fuel') return <Fuel className="h-3.5 w-3.5 text-teal-500 shrink-0 mt-0.5" />;
    if (type === 'news') return <Newspaper className="h-3.5 w-3.5 text-purple-500 shrink-0 mt-0.5" />;
    return <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />;
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Operations command
          </p>
          <h2 className="text-lg font-bold tracking-tight">
            {role} · live fleet dashboard
          </h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Live
          </Badge>

          <Button variant="outline" size="sm" className="gap-1.5" onClick={openFilterModal}>
            <Filter className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 px-1.5 text-[10px]">
                {activeFilterCount}
              </Badge>
            )}
          </Button>

          {canAccess('trips', 'create') && (
            <Link href="/trips?new=true" className={buttonVariants({ size: 'sm' })}>
              Dispatch route
            </Link>
          )}
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {typeFilter !== 'All' && (
            <Badge variant="secondary" className="gap-1">
              Type: {typeFilter}
              <button type="button" onClick={() => setTypeFilter('All')} className="ml-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {statusFilter !== 'All' && (
            <Badge variant="secondary" className="gap-1">
              Status: {statusFilter}
              <button type="button" onClick={() => setStatusFilter('All')} className="ml-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {regionFilter !== 'All' && (
            <Badge variant="secondary" className="gap-1">
              Region: {regionFilter}
              <button type="button" onClick={() => setRegionFilter('All')} className="ml-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <span className="text-[11px] text-muted-foreground">{scoped.length} vehicles in scope</span>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 gap-3">
        {segmentCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.title} href={card.href} className="group">
              <Card className="h-full transition-all hover:shadow-md hover:ring-primary/20 group-hover:-translate-y-0.5">
                <CardHeader className="pb-1 flex flex-row items-start justify-between space-y-0">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <div className={`p-1.5 rounded-md ${card.accent}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tracking-tight">{card.value}</div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{card.subtitle}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* MAP TOP + live vehicle sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-8 overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Live fleet map
                </CardTitle>
                <CardDescription>
                  Routes & status · select a unit from the live strip
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                {onTripVehicles.length} en route
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[380px] md:h-[440px] w-full rounded-md overflow-hidden border border-border relative">
              <LiveFleetMap
                compact
                showRoutes
                selectedVehicleId={selectedVehicleId}
                onSelectVehicle={setSelectedVehicleId}
              />
            </div>
          </CardContent>
        </Card>

        {/* Live vehicle pulse strip — newest updates bubble to top */}
        <Card className="lg:col-span-4 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Radio className="h-4 w-4 text-emerald-500" /> Live vehicles
            </CardTitle>
            <CardDescription className="text-[11px]">
              Updates jump to the top · click to focus map
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-2 overflow-y-auto max-h-[440px]">
            {liveList.length === 0 && (
              <p className="text-xs text-muted-foreground py-6 text-center">Waiting for telemetry…</p>
            )}
            {liveList.map(({ id, pos, vehicle, driver }) => {
              const moving = (pos.speed || 0) > 3;
              const selected = selectedVehicleId === id;
              const flash = flashIds.has(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedVehicleId(id === selectedVehicleId ? null : id)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all duration-500 cursor-pointer ${
                    flash
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-md scale-[1.02] z-10'
                      : selected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate flex items-center gap-1.5">
                        {flash && <Sparkles className="h-3 w-3 text-emerald-500 animate-pulse" />}
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
                        <span>{Math.round(pos.progress * 100)}%</span>
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
            <Link
              href="/vehicles"
              className={`w-full mt-1 ${buttonVariants({ variant: 'outline', size: 'sm' })}`}
            >
              All vehicles <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Live trips · activity · news · role modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Live / new trips */}
        {canAccess('trips', 'read') && (
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Navigation className="h-4 w-4 text-blue-500" /> Live & new trips
              </CardTitle>
              <CardDescription className="text-[11px]">Click any card → Trips</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 flex-1">
              {activeTrips.slice(0, 3).map((t) => (
                <Link
                  key={t.id}
                  href="/trips"
                  className="block p-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-bold">#{t.trip_number}</div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {t.source} → {t.destination}
                      </div>
                    </div>
                    <Badge className="text-[9px] shrink-0 gap-1">
                      <CircleDot className="h-3 w-3" /> Live
                    </Badge>
                  </div>
                </Link>
              ))}
              {draftTrips.slice(0, 2).map((t) => (
                <Link
                  key={t.id}
                  href="/trips"
                  className="block p-2.5 border border-dashed border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-bold">#{t.trip_number}</div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        Draft · {t.source} → {t.destination}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[9px]">
                      New
                    </Badge>
                  </div>
                </Link>
              ))}
              {activeTrips.length === 0 && draftTrips.length === 0 && (
                <p className="text-xs text-muted-foreground">No active or draft trips.</p>
              )}
              <Link
                href="/trips"
                className={`w-full ${buttonVariants({ variant: 'outline', size: 'sm' })}`}
              >
                Trip board
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Live activity feed */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Activity className="h-4 w-4" /> Live activity
            </CardTitle>
            <CardDescription className="text-[11px]">Newest events float up</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 flex-1 max-h-[320px] overflow-y-auto">
            {activityFeed.slice(0, 8).map((item, idx) => (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-start gap-2 p-2 rounded-lg border transition-all hover:bg-muted/50 ${
                  idx === 0 ? 'border-primary/40 bg-primary/5' : 'border-border/60'
                }`}
              >
                {feedIcon(item.type)}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] leading-snug">{item.text}</p>
                  <span className="text-[9px] text-muted-foreground">{item.time}</span>
                </div>
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Maintenance & fuel requests */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Wrench className="h-4 w-4 text-orange-500" /> Maint · Fuel
            </CardTitle>
            <CardDescription className="text-[11px]">Service queue & cost desk</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 flex-1">
            {openMaintenance.slice(0, 3).map((log) => (
              <Link
                key={log.id}
                href="/maintenance"
                className="block p-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="text-xs font-semibold">
                  {log.vehicle?.registration_number || 'Unit'}
                </div>
                <div className="text-[10px] text-muted-foreground line-clamp-2">
                  {log.description}
                </div>
                <Badge variant="destructive" className="text-[9px] mt-1.5">
                  In Shop
                </Badge>
              </Link>
            ))}
            {maintFuelFeed.slice(0, 2).map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-start gap-2 p-2 rounded-lg border border-border/60 hover:bg-muted/50 text-[11px]"
              >
                {feedIcon(item.type)}
                <span className="line-clamp-2">{item.text}</span>
              </Link>
            ))}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link
                href="/maintenance"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                Maintenance
              </Link>
              <Link
                href="/fuel-expenses"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                Fuel
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* News + role insights */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Newspaper className="h-4 w-4 text-purple-500" /> News & insights
            </CardTitle>
            <CardDescription className="text-[11px]">{role} focus</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 flex-1">
            {newsItems.slice(0, 3).map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-start gap-2 p-2 rounded-lg border border-border/60 hover:bg-muted/50"
              >
                {feedIcon(item.type)}
                <div className="min-w-0">
                  <p className="text-[11px] leading-snug">{item.text}</p>
                  <span className="text-[9px] text-muted-foreground">{item.time}</span>
                </div>
              </Link>
            ))}

            {role === 'Safety Officer' && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">
                  License watch
                </span>
                {expiringLicenses.length === 0 ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> All licenses OK
                  </p>
                ) : (
                  expiringLicenses.slice(0, 2).map((d) => (
                    <Link
                      key={d.id}
                      href="/drivers"
                      className="block p-2 border rounded-md text-xs hover:bg-muted/50"
                    >
                      {d.name} · {d.license_expiry_date}
                    </Link>
                  ))
                )}
              </div>
            )}

            {role === 'Fleet Manager' && inShopVehicles.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">
                  In-shop units
                </span>
                {inShopVehicles.slice(0, 2).map((v) => (
                  <Link
                    key={v.id}
                    href="/vehicles"
                    className="flex justify-between p-2 border rounded-md text-xs hover:bg-muted/50"
                  >
                    <span className="font-semibold">{v.registration_number}</span>
                    <Badge variant="destructive" className="text-[9px]">
                      In Shop
                    </Badge>
                  </Link>
                ))}
              </div>
            )}

            {(role === 'Driver' || role === 'Dispatcher') && (
              <Link
                href="/trips?new=true"
                className={`${buttonVariants({ size: 'sm' })} w-full mt-1`}
              >
                Create / dispatch trip
              </Link>
            )}

            {canAccess('reports', 'read') && (
              <Link
                href="/reports"
                className={`${buttonVariants({ variant: 'outline', size: 'sm' })} w-full gap-1`}
              >
                <BarChart3 className="h-3.5 w-3.5" /> Analytics / ROI
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analytics row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {(role === 'Fleet Manager' || role === 'Maintenance Technician') && (
          <AIPredictionCard prediction={mockPrediction} vehicleReg="FLEET-T800" />
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-5 w-5" /> Safety score distribution
            </CardTitle>
            <CardDescription>Driver behavioral scores from telematics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ChartContainer config={{ count: { label: 'Drivers' } }} className="h-full w-full">
                <BarChart
                  data={scoreDistribution}
                  layout="vertical"
                  margin={{ left: 10, right: 30, top: 10, bottom: 10 }}
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    style={{ fontSize: '12px', fill: 'hsl(var(--foreground))', fontWeight: 500 }}
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
            {(role === 'Safety Officer' || role === 'Fleet Manager') && (
              <Link
                href="/safety-command"
                className={`mt-3 ${buttonVariants({ variant: 'outline', size: 'sm' })}`}
              >
                Open safety command
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filter modal */}
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" /> Dashboard filters
            </DialogTitle>
            <DialogDescription>
              Filter KPI scope by vehicle type, status, and region.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label>Vehicle type</Label>
              <Select value={draftType} onValueChange={(v) => v && setDraftType(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Type" />
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
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={draftStatus} onValueChange={(v) => v && setDraftStatus(v)}>
                <SelectTrigger className="w-full">
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
            </div>
            <div className="space-y-2">
              <Label>Region</Label>
              <Select value={draftRegion} onValueChange={(v) => v && setDraftRegion(v)}>
                <SelectTrigger className="w-full">
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
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={clearFilters}>
                Clear all
              </Button>
              <Button className="flex-1" onClick={applyFilters}>
                Apply filters
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
