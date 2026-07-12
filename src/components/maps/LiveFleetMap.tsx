'use client';

import React, { useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useTheme } from 'next-themes';
import { gpsService } from '@/lib/mockServices';
import { db } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  Navigation,
  MapPin,
  Fuel,
  Package,
  Clock,
  Radio,
} from 'lucide-react';
import { Progress, ProgressTrack, ProgressIndicator } from '@/components/ui/progress';

const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

interface LiveFleetMapProps {
  compact?: boolean;
  selectedVehicleId?: string | null;
  showRoutes?: boolean;
  onSelectVehicle?: (id: string | null) => void;
  fill?: boolean;
  className?: string;
}

const ROUTE_COLORS = ['#34d399', '#38bdf8', '#fbbf24', '#a78bfa', '#fb7185', '#2dd4bf'];

type VehicleKind = 'Van' | 'Truck' | 'Bike' | 'Car' | 'Bus' | string;

/** Uber-style top-down vehicle SVG by type (nose points up, rotate by heading) */
function vehicleBodySvg(type: VehicleKind, fill: string, uid: string): string {
  const stroke = 'rgba(255,255,255,0.92)';
  const glass = 'rgba(15,23,42,0.45)';
  const light = '#fef08a';
  const dark = '#0f172a';

  switch (type) {
    case 'Truck':
      // Cab + box body (top-down)
      return `
        <svg width="28" height="44" viewBox="0 0 28 44" fill="none">
          <rect x="5" y="14" width="18" height="26" rx="2.5" fill="${fill}" stroke="${stroke}" stroke-width="1.4"/>
          <rect x="7" y="17" width="14" height="10" rx="1" fill="${glass}"/>
          <rect x="6.5" y="2" width="15" height="13" rx="3" fill="${fill}" stroke="${stroke}" stroke-width="1.4"/>
          <rect x="9" y="4.5" width="10" height="6" rx="1.2" fill="${glass}"/>
          <rect x="8" y="11.5" width="3" height="2" rx="0.5" fill="${light}"/>
          <rect x="17" y="11.5" width="3" height="2" rx="0.5" fill="${light}"/>
          <rect x="3.5" y="18" width="2.2" height="5" rx="0.6" fill="${dark}"/>
          <rect x="22.3" y="18" width="2.2" height="5" rx="0.6" fill="${dark}"/>
          <rect x="3.5" y="32" width="2.2" height="5" rx="0.6" fill="${dark}"/>
          <rect x="22.3" y="32" width="2.2" height="5" rx="0.6" fill="${dark}"/>
        </svg>`;
    case 'Bus':
      return `
        <svg width="26" height="48" viewBox="0 0 26 48" fill="none">
          <rect x="3" y="2" width="20" height="44" rx="5" fill="${fill}" stroke="${stroke}" stroke-width="1.4"/>
          <rect x="6" y="5" width="14" height="8" rx="1.5" fill="${glass}"/>
          <rect x="6" y="16" width="14" height="6" rx="1" fill="${glass}" opacity="0.7"/>
          <rect x="6" y="25" width="14" height="6" rx="1" fill="${glass}" opacity="0.7"/>
          <rect x="6" y="34" width="14" height="6" rx="1" fill="${glass}" opacity="0.55"/>
          <rect x="7" y="1" width="4" height="2.2" rx="0.6" fill="${light}"/>
          <rect x="15" y="1" width="4" height="2.2" rx="0.6" fill="${light}"/>
          <rect x="1" y="12" width="2.2" height="6" rx="0.6" fill="${dark}"/>
          <rect x="22.8" y="12" width="2.2" height="6" rx="0.6" fill="${dark}"/>
          <rect x="1" y="30" width="2.2" height="6" rx="0.6" fill="${dark}"/>
          <rect x="22.8" y="30" width="2.2" height="6" rx="0.6" fill="${dark}"/>
        </svg>`;
    case 'Van':
      return `
        <svg width="26" height="40" viewBox="0 0 26 40" fill="none">
          <path d="M5 12 C5 7 8 4 13 4 C18 4 21 7 21 12 L21.5 34 C21.5 36.5 19.5 38 17 38 L9 38 C6.5 38 4.5 36.5 4.5 34 Z"
            fill="${fill}" stroke="${stroke}" stroke-width="1.4"/>
          <rect x="7.5" y="7" width="11" height="8" rx="1.5" fill="${glass}"/>
          <rect x="7.5" y="18" width="11" height="12" rx="1.2" fill="${glass}" opacity="0.5"/>
          <rect x="8" y="4" width="3.5" height="2" rx="0.5" fill="${light}"/>
          <rect x="14.5" y="4" width="3.5" height="2" rx="0.5" fill="${light}"/>
          <rect x="2.5" y="14" width="2.2" height="5" rx="0.6" fill="${dark}"/>
          <rect x="21.3" y="14" width="2.2" height="5" rx="0.6" fill="${dark}"/>
          <rect x="2.5" y="28" width="2.2" height="5" rx="0.6" fill="${dark}"/>
          <rect x="21.3" y="28" width="2.2" height="5" rx="0.6" fill="${dark}"/>
        </svg>`;
    case 'Bike':
      return `
        <svg width="20" height="36" viewBox="0 0 20 36" fill="none">
          <ellipse cx="10" cy="8" rx="4.5" ry="6" fill="${fill}" stroke="${stroke}" stroke-width="1.3"/>
          <rect x="7.5" y="12" width="5" height="12" rx="1.5" fill="${fill}" stroke="${stroke}" stroke-width="1.2"/>
          <ellipse cx="10" cy="28" rx="4.5" ry="6" fill="${fill}" stroke="${stroke}" stroke-width="1.3"/>
          <circle cx="10" cy="8" r="2" fill="${dark}"/>
          <circle cx="10" cy="28" r="2" fill="${dark}"/>
          <rect x="8.5" y="3" width="3" height="2" rx="0.5" fill="${light}"/>
        </svg>`;
    case 'Car':
    default:
      // Sedan top-down (Uber-like)
      return `
        <svg width="24" height="40" viewBox="0 0 24 40" fill="none">
          <path d="M6 11 C6 6.5 9 3.5 12 3.5 C15 3.5 18 6.5 18 11 L18.5 29 C18.5 33 15.5 36.5 12 36.5 C8.5 36.5 5.5 33 5.5 29 Z"
            fill="${fill}" stroke="${stroke}" stroke-width="1.4"/>
          <path d="M8 12 C8.5 9.5 10 8 12 8 C14 8 15.5 9.5 16 12 L15.2 16.5 H8.8 Z" fill="${glass}"/>
          <path d="M8.5 22 H15.5 L15 28.5 C14.5 30 13.2 31 12 31 C10.8 31 9.5 30 9 28.5 Z" fill="${glass}" opacity="0.55"/>
          <rect x="8" y="3.5" width="3" height="1.8" rx="0.5" fill="${light}"/>
          <rect x="13" y="3.5" width="3" height="1.8" rx="0.5" fill="${light}"/>
          <rect x="3.2" y="13" width="2.2" height="5" rx="0.7" fill="${dark}"/>
          <rect x="18.6" y="13" width="2.2" height="5" rx="0.7" fill="${dark}"/>
          <rect x="3.2" y="24" width="2.2" height="5" rx="0.7" fill="${dark}"/>
          <rect x="18.6" y="24" width="2.2" height="5" rx="0.7" fill="${dark}"/>
        </svg>`;
  }
}

/** Map marker — Uber-style top-down vehicle by type, status color, heading */
const createMarkerIcon = (
  status: string,
  reg: string,
  isSelected: boolean,
  heading: number,
  vehicleType: VehicleKind = 'Car'
) => {
  let fill = '#38bdf8'; // Available
  if (status === 'On Trip') fill = '#34d399';
  if (status === 'In Shop') fill = '#f87171';
  if (status === 'Retired') fill = '#94a3b8';

  const glow = isSelected
    ? `0 0 0 3px ${fill}70, 0 4px 14px rgba(0,0,0,.55)`
    : '0 2px 8px rgba(0,0,0,.5)';
  const scale = isSelected ? 1.14 : 1;
  const shortReg = reg.length > 8 ? reg.slice(-7) : reg;
  const uid = reg.replace(/[^a-zA-Z0-9]/g, '');
  const body = vehicleBodySvg(vehicleType, fill, uid);

  // Size box depends on type
  const boxH =
    vehicleType === 'Bus' ? 52 : vehicleType === 'Truck' ? 48 : vehicleType === 'Bike' ? 40 : 44;

  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:scale(${scale});filter:drop-shadow(${glow});transition:transform .15s ease">
        <div style="
          display:flex;align-items:center;justify-content:center;
          transform:rotate(${heading}deg);
          line-height:0;
        ">
          ${body}
        </div>
        <div style="
          margin-top:3px;padding:2px 7px;border-radius:999px;
          background:rgba(15,23,42,.92);color:#f8fafc;
          font-size:9px;font-weight:500;letter-spacing:.03em;
          white-space:nowrap;border:1px solid ${fill}66;
          font-family:ui-sans-serif,system-ui,sans-serif;
          box-shadow:0 1px 4px rgba(0,0,0,.35);
        ">${shortReg}</div>
      </div>
    `,
    iconSize: [48, boxH + 16],
    iconAnchor: [24, boxH / 2],
    popupAnchor: [0, -(boxH / 2 + 4)],
  });
};

function MapController({ selectedPos }: { selectedPos: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (selectedPos) {
      map.flyTo([selectedPos.lat, selectedPos.lng], 13, { duration: 1.2 });
    }
  }, [selectedPos, map]);
  return null;
}

/** Persist live lat/lng into sandbox DB so map state survives reloads */
function persistPositions(
  positions: Record<
    string,
    {
      lat: number;
      lng: number;
      heading?: number;
      speed?: number;
      fuel_percent?: number;
      cargo_kg?: number;
      cargo_max?: number;
      destination?: string;
      eta_minutes?: number;
    }
  >
) {
  if (typeof window === 'undefined') return;
  try {
    const slim: Record<
      string,
      {
        lat: number;
        lng: number;
        heading: number;
        speed: number;
        fuel_percent: number;
        cargo_kg: number;
        cargo_max: number;
        destination: string;
        eta_minutes: number;
        at: string;
      }
    > = {};
    for (const [id, p] of Object.entries(positions)) {
      slim[id] = {
        lat: Number(p.lat.toFixed(6)),
        lng: Number(p.lng.toFixed(6)),
        heading: p.heading ?? 0,
        speed: p.speed ?? 0,
        fuel_percent: p.fuel_percent ?? 0,
        cargo_kg: p.cargo_kg ?? 0,
        cargo_max: p.cargo_max ?? 0,
        destination: p.destination ?? '',
        eta_minutes: p.eta_minutes ?? 0,
        at: new Date().toISOString(),
      };
    }
    void db.saveGpsPositions(slim);
  } catch {
    /* ignore quota */
  }
}

export default function LiveFleetMap({
  compact = false,
  selectedVehicleId = null,
  showRoutes = true,
  onSelectVehicle,
  fill = false,
  className = '',
}: LiveFleetMapProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isDark = !mounted || resolvedTheme === 'dark';
  const tileUrl = isDark ? TILE_DARK : TILE_LIGHT;

  const [positions, setPositions] = useState<
    Record<
      string,
      {
        lat: number;
        lng: number;
        speed: number;
        heading: number;
        fuel_percent: number;
        cargo_kg: number;
        cargo_max: number;
        destination: string;
        eta_minutes: number;
        progress?: number;
      }
    >
  >({});
  const [routes, setRoutes] = useState<Record<string, { lat: number; lng: number }[]>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchPos = () => {
      const live = gpsService.getLiveFleetState();
      setPositions(live.positions);
      setRoutes(live.routes);
      persistPositions(live.positions);
    };
    fetchPos();
    const interval = setInterval(fetchPos, 2500);
    // Instant refresh when a trip is dispatched / completed
    const onOps = () => fetchPos();
    window.addEventListener('transitops:ops', onOps);
    return () => {
      clearInterval(interval);
      window.removeEventListener('transitops:ops', onOps);
    };
  }, []);

  const getSafetyIcon = (score: number) => {
    if (score >= 90) return <ShieldCheck className="h-4 w-4 text-emerald-500" />;
    if (score >= 75) return <AlertCircle className="h-4 w-4 text-amber-500" />;
    return <ShieldAlert className="h-4 w-4 text-destructive" />;
  };

  const selectedPos = selectedVehicleId ? positions[selectedVehicleId] : null;
  const onTripCount = Object.values(positions).filter((p) => (p.speed || 0) > 0).length;

  const heightClass = fill
    ? 'h-full min-h-0'
    : compact
      ? 'h-full min-h-[360px]'
      : 'h-[calc(100vh-140px)]';

  // Slightly softer route colors on light maps for contrast
  const routeColors = isDark
    ? ROUTE_COLORS
    : ['#059669', '#0284c7', '#d97706', '#7c3aed', '#e11d48', '#0d9488'];

  return (
    <div
      className={`relative z-0 ${heightClass} w-full overflow-hidden border border-border ${className}`}
    >
      <div className="absolute top-3 right-3 z-[400] bg-background/90 backdrop-blur border border-border px-2.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 text-[10px] font-normal uppercase tracking-wider">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        Live · {onTripCount} en route
        {gpsService.getActiveDispatchCount() > 0 && (
          <span className="normal-case tracking-normal text-muted-foreground">
            · {gpsService.getActiveDispatchCount()} dispatched
          </span>
        )}
      </div>

      {/* key forces tile refresh when theme flips */}
      <MapContainer
        key={isDark ? 'map-dark' : 'map-light'}
        center={[18.5204, 73.8567]}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        className={`z-0 leaflet-theme ${isDark ? 'leaflet-dark' : 'leaflet-light'}`}
        attributionControl={false}
        zoomControl={true}
      >
        <TileLayer url={tileUrl} attribution="" />

        <MapController selectedPos={selectedPos ? { lat: selectedPos.lat, lng: selectedPos.lng } : null} />

        {showRoutes &&
          Object.entries(routes).map(([vehicleId, points], idx) => {
            if (!points || points.length < 2) return null;
            const isSelected = selectedVehicleId === vehicleId;
            const color = routeColors[idx % routeColors.length];
            return (
              <Polyline
                key={`route-${vehicleId}`}
                positions={points.map((p) => [p.lat, p.lng] as [number, number])}
                pathOptions={{
                  color,
                  weight: isSelected ? 5 : 3.5,
                  opacity: isSelected ? 0.95 : isDark ? 0.65 : 0.75,
                  lineCap: 'round',
                  lineJoin: 'round',
                  dashArray: isSelected ? undefined : '10 8',
                }}
              />
            );
          })}

        {Object.entries(positions).map(([vId, pos]) => {
          const info = gpsService.getDriverForVehicle(vId);
          const vehicle = info?.vehicle;
          const driver = info?.driver;
          if (!vehicle) return null;
          const isSelected = selectedVehicleId === vId;

          return (
            <Marker
              key={vId}
              position={[pos.lat, pos.lng]}
              icon={createMarkerIcon(
                vehicle.status,
                vehicle.registration_number,
                isSelected,
                pos.heading || 0,
                vehicle.type || 'Car'
              )}
              eventHandlers={{
                click: () => onSelectVehicle?.(vId),
              }}
            >
              <Popup className="custom-popup" closeButton={false} minWidth={280}>
                <Card className="border-0 shadow-none bg-transparent">
                  <CardContent className="p-0 space-y-3 font-normal">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-foreground m-0 p-0 leading-tight text-sm">
                          {driver?.name || 'Unassigned'}
                        </h4>
                        <span className="text-[10px] text-muted-foreground">
                          {vehicle.registration_number} · {vehicle.model}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className="bg-background text-[10px] font-normal">
                          {vehicle.status}
                        </Badge>
                        {driver && (
                          <Badge variant="outline" className="bg-background flex gap-1 font-normal">
                            {getSafetyIcon(driver.safety_score)}
                            <span
                              className={
                                driver.safety_score >= 90
                                  ? 'text-emerald-500'
                                  : driver.safety_score >= 75
                                    ? 'text-amber-500'
                                    : 'text-destructive'
                              }
                            >
                              {driver.safety_score}
                            </span>
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-2 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-foreground">
                        <MapPin className="h-3.5 w-3.5 text-sky-500" />
                        <span className="truncate flex-1">{pos.destination || 'Unassigned'}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground tabular-nums">
                        Lat {pos.lat.toFixed(5)} · Lng {pos.lng.toFixed(5)}
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Navigation className="h-3 w-3" />
                          {Math.round(pos.speed)} km/h
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          ETA: {pos.eta_minutes}m
                        </div>
                        {typeof pos.progress === 'number' && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Radio className="h-3 w-3" />
                            {Math.round(pos.progress * 100)}%
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3" /> Load (
                          {Math.round((pos.cargo_kg / Math.max(pos.cargo_max, 1)) * 100)}%)
                        </span>
                        <span>
                          {pos.cargo_kg}/{pos.cargo_max} kg
                        </span>
                      </div>
                      <Progress value={(pos.cargo_kg / Math.max(pos.cargo_max, 1)) * 100}>
                        <ProgressTrack className="h-1.5">
                          <ProgressIndicator />
                        </ProgressTrack>
                      </Progress>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Fuel className="h-3 w-3" /> Fuel
                        </span>
                        <span className={pos.fuel_percent < 20 ? 'text-destructive' : ''}>
                          {pos.fuel_percent}%
                        </span>
                      </div>
                      <Progress value={pos.fuel_percent}>
                        <ProgressTrack className="h-1.5">
                          <ProgressIndicator
                            className={pos.fuel_percent < 20 ? 'bg-destructive' : 'bg-sky-500'}
                          />
                        </ProgressTrack>
                      </Progress>
                    </div>
                  </CardContent>
                </Card>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <div className="absolute bottom-3 left-3 z-[400] bg-background/90 backdrop-blur border border-border p-2 rounded-lg shadow-lg flex flex-wrap gap-3 text-[11px] font-normal">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> On Trip
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-sky-500" /> Available
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400" /> In Shop
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <div className="h-0.5 w-4 bg-emerald-400 rounded" /> Route
        </div>
      </div>
    </div>
  );
}
