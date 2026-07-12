'use client';

import React, { useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { gpsService } from '@/lib/mockServices';
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

interface LiveFleetMapProps {
  compact?: boolean;
  selectedVehicleId?: string | null;
  showRoutes?: boolean;
  onSelectVehicle?: (id: string | null) => void;
  /** Fill parent height instead of fixed sizes */
  fill?: boolean;
  className?: string;
}

const ROUTE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444'];

const createMarkerIcon = (status: string, reg: string, isSelected: boolean) => {
  let colorClass = 'bg-blue-500';
  if (status === 'On Trip') colorClass = 'bg-emerald-500';
  if (status === 'In Shop') colorClass = 'bg-red-500';
  if (status === 'Available') colorClass = 'bg-sky-500';

  const ring = isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent scale-125' : '';

  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `<div class="relative flex flex-col items-center group">
             <div class="h-7 w-7 rounded-full border-2 border-white shadow-lg flex items-center justify-center ${colorClass} ${ring}" style="animation: pulse 2s infinite">
               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11h12Z"/><path d="M14 8h3.3a2 2 0 0 1 1.96 1.6l.74 3.7A2 2 0 0 1 20 15v3h-6"/></svg>
             </div>
             <div class="absolute top-8 bg-background border border-border text-foreground text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm opacity-90 whitespace-nowrap z-50">
               ${reg}
             </div>
           </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
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

export default function LiveFleetMap({
  compact = false,
  selectedVehicleId = null,
  showRoutes = true,
  onSelectVehicle,
  fill = false,
  className = '',
}: LiveFleetMapProps) {
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
        status?: string;
        routeId?: string;
        progress?: number;
      }
    >
  >({});
  const [routes, setRoutes] = useState<Record<string, { lat: number; lng: number }[]>>({});
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const fetchPos = () => {
      const live = gpsService.getLiveFleetState();
      setPositions(live.positions);
      setRoutes(live.routes);
      setTick((t) => t + 1);
    };
    fetchPos();
    const interval = setInterval(fetchPos, 2500);
    return () => clearInterval(interval);
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

  return (
    <div
      className={`relative z-0 ${heightClass} w-full overflow-hidden border border-border ${className}`}
    >
      {/* Live indicator */}
      <div className="absolute top-3 right-3 z-[400] bg-background/90 backdrop-blur border border-border px-2.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        Live · {onTripCount} en route · tick {tick}
      </div>

      <MapContainer
        center={[19.076, 72.8777]}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        <MapController selectedPos={selectedPos ? { lat: selectedPos.lat, lng: selectedPos.lng } : null} />

        {/* Live route polylines */}
        {showRoutes &&
          Object.entries(routes).map(([vehicleId, points], idx) => {
            if (!points || points.length < 2) return null;
            const isSelected = selectedVehicleId === vehicleId;
            return (
              <Polyline
                key={`route-${vehicleId}`}
                positions={points.map((p) => [p.lat, p.lng] as [number, number])}
                pathOptions={{
                  color: ROUTE_COLORS[idx % ROUTE_COLORS.length],
                  weight: isSelected ? 5 : 3,
                  opacity: isSelected ? 0.95 : 0.55,
                  dashArray: isSelected ? undefined : '8 6',
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
              icon={createMarkerIcon(vehicle.status, vehicle.registration_number, isSelected)}
              eventHandlers={{
                click: () => onSelectVehicle?.(vId),
              }}
            >
              <Popup className="custom-popup" closeButton={false} minWidth={280}>
                <Card className="border-0 shadow-none bg-transparent">
                  <CardContent className="p-0 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-foreground m-0 p-0 leading-tight">
                          {driver?.name || 'Unassigned'}
                        </h4>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {vehicle.registration_number} · {vehicle.model}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className="bg-background text-[10px]">
                          {vehicle.status}
                        </Badge>
                        {driver && (
                          <Badge variant="outline" className="bg-background flex gap-1">
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
                        <MapPin className="h-3.5 w-3.5 text-blue-500" />
                        <span className="truncate flex-1">{pos.destination || 'Unassigned'}</span>
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
                        <span className={pos.fuel_percent < 20 ? 'text-destructive font-bold' : ''}>
                          {pos.fuel_percent}%
                        </span>
                      </div>
                      <Progress value={pos.fuel_percent}>
                        <ProgressTrack className="h-1.5">
                          <ProgressIndicator
                            className={pos.fuel_percent < 20 ? 'bg-destructive' : 'bg-blue-500'}
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

      <div className="absolute bottom-4 left-4 z-[400] bg-background/90 backdrop-blur border border-border p-2 rounded-lg shadow-lg flex flex-wrap gap-3 text-xs font-medium">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-emerald-500" /> On Trip
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-sky-500" /> Available
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-500" /> In Shop
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <div className="h-0.5 w-4 bg-emerald-500 rounded" /> Live route
        </div>
      </div>
    </div>
  );
}
