'use client';

import React, { useState, useEffect, useRef, useMemo, useLayoutEffect, useCallback } from 'react';
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
import { gpsService, economicService } from '@/lib/mockServices';
import type { FuelPriceData, FuelForecast } from '@/lib/mockData';
import {
  TrendingUp,
  Truck,
  Users,
  Wrench,
  ArrowRight,
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
  X,
  TrendingDown,
  Minus,
  Brain,
  Maximize2,
} from 'lucide-react';
import AIPredictionCard from '@/components/ai/AIPredictionCard';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Cell, AreaChart, Area } from 'recharts';
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

/** Smooth FLIP reorder — cards stay normal; only position eases when order changes. */
function useSmoothList(ids: string[]) {
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const prevRects = useRef<Map<string, DOMRect>>(new Map());

  const setItemRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) itemRefs.current.set(id, el);
    else itemRefs.current.delete(id);
  }, []);

  useLayoutEffect(() => {
    const nextRects = new Map<string, DOMRect>();
    ids.forEach((id) => {
      const el = itemRefs.current.get(id);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      nextRects.set(id, rect);
      const prev = prevRects.current.get(id);
      if (prev) {
        const dy = prev.top - rect.top;
        if (Math.abs(dy) > 1) {
          el.animate(
            [{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0)' }],
            { duration: 520, easing: 'cubic-bezier(0.25, 0.8, 0.25, 1)' }
          );
        }
      }
    });
    prevRects.current = nextRects;
  }, [ids]);

  return setItemRef;
}

function bumpToTop<T extends { id: string }>(list: T[], id: string): T[] {
  const idx = list.findIndex((x) => x.id === id);
  if (idx <= 0) return list;
  const next = [...list];
  const [item] = next.splice(idx, 1);
  next.unshift(item);
  return next;
}

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
  const prevPosRef = useRef<Record<string, { lat: number; lng: number; speed: number }>>({});
  const firstGpsTick = useRef(true);

  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [regionFilter, setRegionFilter] = useState('All');
  const [filterOpen, setFilterOpen] = useState(false);
  // Draft filters inside modal
  const [draftType, setDraftType] = useState('All');
  const [draftStatus, setDraftStatus] = useState('All');
  const [draftRegion, setDraftRegion] = useState('All');

  const [activityFeed, setActivityFeed] = useState<FeedItem[]>([]);
  const [tripCards, setTripCards] = useState<
    { id: string; trip_number: number; source: string; destination: string; kind: 'live' | 'draft' }[]
  >([]);
  const [maintCards, setMaintCards] = useState<
    { id: string; reg: string; description: string; kind: 'maint' | 'fuel'; href: string }[]
  >([]);
  const [insightCards, setInsightCards] = useState<FeedItem[]>([]);
  const [fuelIndex, setFuelIndex] = useState<FuelPriceData | null>(null);
  const [fuelForecast, setFuelForecast] = useState<FuelForecast[]>([]);
  const [mapFullscreen, setMapFullscreen] = useState(false);

  useEffect(() => {
    Promise.all([economicService.getFuelPrice(), economicService.getFuelForecast()])
      .then(([price, forecast]) => {
        setFuelIndex(price);
        setFuelForecast(forecast);
      })
      .catch(console.error);
  }, []);

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

        setTripCards([
          ...t
            .filter((x) => x.status === 'Dispatched')
            .map((x) => ({
              id: x.id,
              trip_number: x.trip_number,
              source: x.source,
              destination: x.destination,
              kind: 'live' as const,
            })),
          ...t
            .filter((x) => x.status === 'Draft')
            .map((x) => ({
              id: x.id,
              trip_number: x.trip_number,
              source: x.source,
              destination: x.destination,
              kind: 'draft' as const,
            })),
        ]);

        setMaintCards([
          ...m
            .filter((x) => x.status === 'Open')
            .map((x) => ({
              id: x.id,
              reg: x.vehicle?.registration_number || 'Unit',
              description: x.description,
              kind: 'maint' as const,
              href: '/maintenance',
            })),
          {
            id: 'fuel-desk',
            reg: 'Fuel desk',
            description: 'Review recent fill-ups & expense ledger',
            kind: 'fuel' as const,
            href: '/fuel-expenses',
          },
        ]);

        setInsightCards(feed.filter((a) => a.type === 'news' || a.type === 'alert'));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Live positions — on real update, that vehicle slides smoothly to top (no flash)
  useEffect(() => {
    const tick = () => {
      const state = gpsService.getLiveFleetState();
      const positions = state.positions;
      setLivePositions(positions);

      const prev = prevPosRef.current;
      const updated: string[] = [];

      for (const [id, pos] of Object.entries(positions)) {
        const p = prev[id];
        if (!p) continue; // first sample for this unit — don't reorder yet
        const moved =
          Math.abs(p.lat - pos.lat) > 0.0002 ||
          Math.abs(p.lng - pos.lng) > 0.0002 ||
          Math.abs(p.speed - pos.speed) > 4;
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
        // First tick: keep stable order (moving units first is fine once)
        if (firstGpsTick.current) {
          firstGpsTick.current = false;
          return next;
        }
        // Only promote one unit at a time so the slide is clear
        if (updated.length) {
          const promote = updated[updated.length - 1];
          next = [promote, ...next.filter((id) => id !== promote)];
        }
        return next;
      });
    };

    tick();
    const id = setInterval(tick, 2800);
    return () => clearInterval(id);
  }, []);

  // Periodically promote an existing item in each feed (smooth slide to top)
  useEffect(() => {
    const id = setInterval(() => {
      setActivityFeed((prev) => {
        if (prev.length < 2) return prev;
        // Prefer promoting something not already at top
        const pick = prev[1 + Math.floor(Math.random() * Math.min(4, prev.length - 1))];
        return bumpToTop(
          prev.map((x) =>
            x.id === pick.id ? { ...x, time: 'Just now', ts: Date.now() } : x
          ),
          pick.id
        );
      });

      setTripCards((prev) => {
        if (prev.length < 2) return prev;
        const pick = prev[1 + Math.floor(Math.random() * Math.min(3, prev.length - 1))];
        return bumpToTop(prev, pick.id);
      });

      setMaintCards((prev) => {
        if (prev.length < 2) return prev;
        const pick = prev[1 + Math.floor(Math.random() * Math.min(3, prev.length - 1))];
        return bumpToTop(prev, pick.id);
      });

      setInsightCards((prev) => {
        if (prev.length < 2) return prev;
        const pick = prev[1 + Math.floor(Math.random() * Math.min(3, prev.length - 1))];
        return bumpToTop(
          prev.map((x) =>
            x.id === pick.id ? { ...x, time: 'Just now', ts: Date.now() } : x
          ),
          pick.id
        );
      });
    }, 7000);
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
  // Explicit hex so bars stay visible in dark mode (CSS vars can wash out)
  const scoreDistribution = [
    { name: '90-100 Excellent', count: excellentDrivers.length, fill: '#34d399' },
    {
      name: '75-89 Average',
      count: mockDrivers.length - highRiskDrivers.length - excellentDrivers.length,
      fill: '#e5e5e5',
    },
    { name: '<75 High Risk', count: highRiskDrivers.length, fill: '#f87171' },
  ];

  const expiringLicenses = drivers.filter((d) => {
    const expiry = new Date(d.license_expiry_date);
    const diffDays = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  });

  const vehicleIds = liveList.map((x) => x.id);
  const tripIds = tripCards.slice(0, 5).map((x) => x.id);
  const activityIds = activityFeed.slice(0, 8).map((x) => x.id);
  const maintIds = maintCards.slice(0, 5).map((x) => x.id);
  const insightIds = insightCards.slice(0, 5).map((x) => x.id);

  const setVehicleRef = useSmoothList(vehicleIds);
  const setTripRef = useSmoothList(tripIds);
  const setActivityRef = useSmoothList(activityIds);
  const setMaintRef = useSmoothList(maintIds);
  const setInsightRef = useSmoothList(insightIds);

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
    <div className="space-y-2 animate-in fade-in duration-300">
      {/* Dashboard title + filters on one horizontal row */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <h1 className="text-lg tracking-tight text-foreground font-normal pl-0.5 sm:pl-1">
            Dashboard
          </h1>
          {activeFilterCount > 0 && (
            <>
              {typeFilter !== 'All' && (
                <Badge variant="secondary" className="gap-1 font-normal">
                  Type: {typeFilter}
                  <button type="button" onClick={() => setTypeFilter('All')} className="ml-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {statusFilter !== 'All' && (
                <Badge variant="secondary" className="gap-1 font-normal">
                  Status: {statusFilter}
                  <button type="button" onClick={() => setStatusFilter('All')} className="ml-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {regionFilter !== 'All' && (
                <Badge variant="secondary" className="gap-1 font-normal">
                  Region: {regionFilter}
                  <button type="button" onClick={() => setRegionFilter('All')} className="ml-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1.5 font-normal">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Live
          </Badge>
          <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={openFilterModal}>
            <Filter className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 px-1.5 text-[10px] font-normal">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          {canAccess('trips', 'create') && (
            <Link href="/trips?new=true" className={buttonVariants({ size: 'sm' }) + ' h-8'}>
              Dispatch route
            </Link>
          )}
        </div>
      </div>

      {/* Map + right stack (fuel then live units) — heights aligned */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch">
        <Card className="lg:col-span-8 overflow-hidden flex flex-col gap-0 py-0">
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-border shrink-0">
            <span className="text-sm font-normal flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Live fleet map
            </span>
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-normal">
                {onTripVehicles.length} en route
              </Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs font-normal"
                onClick={() => setMapFullscreen(true)}
              >
                <Maximize2 className="h-3.5 w-3.5" />
                Fullscreen
              </Button>
            </div>
          </div>
          <div className="flex-1 min-h-[420px] h-[420px] md:min-h-[480px] md:h-[480px] w-full">
            <LiveFleetMap
              compact
              fill
              showRoutes
              className="rounded-none border-0 shadow-none"
              selectedVehicleId={selectedVehicleId}
              onSelectVehicle={setSelectedVehicleId}
            />
          </div>
        </Card>

        <div className="lg:col-span-4 flex flex-col gap-2.5 min-h-0 h-auto md:h-[calc(1.5rem+480px)]">
          {/* Global fuel index */}
          <Card className="border-border/50 shrink-0 gap-0 py-0">
            <div className="px-3 py-1.5 border-b border-border">
              <span className="text-xs text-muted-foreground uppercase tracking-widest font-normal">
                Global fuel index
              </span>
            </div>
            <div className="px-3 py-2">
              {fuelIndex ? (
                <>
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <span className="text-2xl tracking-tight font-normal">
                        ${fuelIndex.price.toFixed(2)}
                      </span>
                      <span className="text-sm text-muted-foreground ml-1">/ L</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`gap-1 font-normal ${
                        fuelIndex.trend === 'rising'
                          ? 'text-amber-400 border-amber-400/40 bg-amber-500/10'
                          : fuelIndex.trend === 'falling'
                            ? 'text-emerald-400 border-emerald-400/40 bg-emerald-500/10'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {fuelIndex.trend === 'rising' ? (
                        <TrendingUp className="h-3.5 w-3.5" />
                      ) : fuelIndex.trend === 'falling' ? (
                        <TrendingDown className="h-3.5 w-3.5" />
                      ) : (
                        <Minus className="h-3.5 w-3.5" />
                      )}
                      {fuelIndex.changePercent}%
                    </Badge>
                  </div>

                  {/* Amber stroke — always visible on dark cards */}
                  <div className="h-[120px]">
                    <ChartContainer
                      config={{
                        price: {
                          label: 'Forecast price',
                          color: '#fbbf24',
                        },
                      }}
                      className="h-full w-full"
                    >
                      <AreaChart data={fuelForecast} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="dashFillPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area
                          dataKey="price"
                          type="monotone"
                          stroke="#fbbf24"
                          fill="url(#dashFillPrice)"
                          strokeWidth={2.5}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ChartContainer>
                  </div>

                  <div className="mt-2 p-2 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-[11px] text-primary flex items-start gap-2 leading-snug font-normal">
                      <Brain className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      AI suggests locking fuel contracts this week before an anticipated 8% hike.
                    </p>
                  </div>
                  <Link
                    href="/economic-simulator"
                    className={`${buttonVariants({ variant: 'outline', size: 'sm' })} w-full mt-2 font-normal`}
                  >
                    Open economics
                  </Link>
                </>
              ) : (
                <div className="h-32 animate-pulse bg-muted rounded-lg" />
              )}
            </div>
          </Card>

          {/* Live units below fuel */}
          <Card className="flex flex-col min-h-0 flex-1 gap-0 py-0 overflow-hidden">
            <div className="px-3 py-1.5 border-b border-border shrink-0">
              <span className="text-sm font-normal flex items-center gap-2">
                <Radio className="h-4 w-4 text-emerald-500" /> Live units
              </span>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto px-3 py-2 min-h-0">
              {liveList.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Waiting for telemetry…
                </p>
              )}
              {liveList.map(({ id, pos, vehicle, driver }) => {
                const moving = (pos.speed || 0) > 3;
                const selected = selectedVehicleId === id;
                return (
                  <button
                    key={id}
                    ref={(el) => setVehicleRef(id, el)}
                    type="button"
                    onClick={() => setSelectedVehicleId(id === selectedVehicleId ? null : id)}
                    className={`w-full text-left p-2.5 rounded-xl border cursor-pointer ${
                      selected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm truncate font-normal">
                          {vehicle?.registration_number}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {driver?.name || '—'} · {pos.destination || vehicle?.status}
                        </div>
                      </div>
                      <Badge
                        variant={moving ? 'default' : 'secondary'}
                        className="text-[9px] shrink-0 font-normal"
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
                className={`w-full mt-1 ${buttonVariants({ variant: 'outline', size: 'sm' })} font-normal`}
              >
                All vehicles <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* Fullscreen map popup */}
      <Dialog open={mapFullscreen} onOpenChange={setMapFullscreen}>
        <DialogContent className="sm:max-w-[min(96vw,1200px)] w-[96vw] h-[90vh] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-4 py-2.5 border-b border-border shrink-0 space-y-0">
            <DialogTitle className="text-base font-normal flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Detailed live fleet map
            </DialogTitle>
            <DialogDescription className="text-xs font-normal">
              Full view · click units for telemetry · routes update live
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 w-full">
            <LiveFleetMap
              fill
              showRoutes
              className="rounded-none border-0 shadow-none h-full"
              selectedVehicleId={selectedVehicleId}
              onSelectVehicle={setSelectedVehicleId}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Live trips · activity · maint · insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {canAccess('trips', 'read') && (
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal flex items-center gap-2">
                <Navigation className="h-4 w-4 text-blue-500" /> Live & new trips
              </CardTitle>
              <CardDescription className="text-[11px]">Click any card → Trips</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 flex-1">
              {tripCards.slice(0, 5).map((t) => (
                <Link
                  key={t.id}
                  ref={(el) => setTripRef(t.id, el)}
                  href="/trips"
                  className={`block p-2.5 border rounded-lg hover:bg-muted/50 ${
                    t.kind === 'draft' ? 'border-dashed border-border' : 'border-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-normal">#{t.trip_number}</div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {t.kind === 'draft' ? 'Draft · ' : ''}
                        {t.source} → {t.destination}
                      </div>
                    </div>
                    <Badge
                      variant={t.kind === 'live' ? 'default' : 'secondary'}
                      className="text-[9px] shrink-0 gap-1"
                    >
                      {t.kind === 'live' ? (
                        <>
                          <CircleDot className="h-3 w-3" /> Live
                        </>
                      ) : (
                        'New'
                      )}
                    </Badge>
                  </div>
                </Link>
              ))}
              {tripCards.length === 0 && (
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

        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal flex items-center gap-2">
              <Activity className="h-4 w-4" /> Live activity
            </CardTitle>
            <CardDescription className="text-[11px]">Updates slide to the top</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 flex-1 max-h-[320px] overflow-y-auto">
            {activityFeed.slice(0, 8).map((item) => (
              <Link
                key={item.id}
                ref={(el) => setActivityRef(item.id, el)}
                href={item.href}
                className="flex items-start gap-2 p-2 rounded-lg border border-border/60 hover:bg-muted/50"
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

        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal flex items-center gap-2">
              <Wrench className="h-4 w-4 text-orange-500" /> Maint · Fuel
            </CardTitle>
            <CardDescription className="text-[11px]">Service queue & cost desk</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 flex-1">
            {maintCards.slice(0, 5).map((card) => (
              <Link
                key={card.id}
                ref={(el) => setMaintRef(card.id, el)}
                href={card.href}
                className="block p-2.5 border border-border rounded-lg hover:bg-muted/50"
              >
                <div className="text-xs font-medium">{card.reg}</div>
                <div className="text-[10px] text-muted-foreground line-clamp-2">
                  {card.description}
                </div>
                <Badge
                  variant={card.kind === 'maint' ? 'destructive' : 'secondary'}
                  className="text-[9px] mt-1.5"
                >
                  {card.kind === 'maint' ? 'In Shop' : 'Fuel'}
                </Badge>
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

        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal flex items-center gap-2">
              <Newspaper className="h-4 w-4 text-purple-500" /> News & insights
            </CardTitle>
            <CardDescription className="text-[11px]">{role} focus</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 flex-1">
            {insightCards.slice(0, 4).map((item) => (
              <Link
                key={item.id}
                ref={(el) => setInsightRef(item.id, el)}
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
                <span className="text-[10px] font-normal text-muted-foreground uppercase">
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
                <span className="text-[10px] font-normal text-muted-foreground uppercase">
                  In-shop units
                </span>
                {inShopVehicles.slice(0, 2).map((v) => (
                  <Link
                    key={v.id}
                    href="/vehicles"
                    className="flex justify-between p-2 border rounded-md text-xs hover:bg-muted/50"
                  >
                    <span className="font-medium">{v.registration_number}</span>
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
            <CardTitle className="flex items-center gap-2 text-base font-normal">
              <Activity className="h-5 w-5" /> Safety score distribution
            </CardTitle>
            <CardDescription className="font-normal">Driver behavioral scores from telematics</CardDescription>
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
                    tick={{ fill: 'currentColor', fontSize: 12, fontWeight: 400 }}
                    className="text-foreground"
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
