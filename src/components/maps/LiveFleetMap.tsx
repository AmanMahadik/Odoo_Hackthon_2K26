'use client';

import React, { useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { gpsService } from '@/lib/mockServices';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldCheck, ShieldAlert, AlertCircle, Navigation, MapPin, Fuel, Package, Clock } from 'lucide-react';
import { Progress, ProgressTrack, ProgressIndicator } from '@/components/ui/progress';

interface LiveFleetMapProps {
  compact?: boolean;
  selectedVehicleId?: string | null;
}

// Fix default icon issue with Leaflet in Next.js by using DivIcons
const createMarkerIcon = (status: string, reg: string) => {
  let colorClass = 'bg-blue-500';
  if (status === 'On Trip') colorClass = 'bg-emerald-500';
  if (status === 'In Shop') colorClass = 'bg-red-500';
  
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `<div class="relative flex flex-col items-center group">
             <div class="h-6 w-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center ${colorClass} animate-pulse-slow">
               <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11h12Z"/><path d="M14 8h3.3a2 2 0 0 1 1.96 1.6l.74 3.7A2 2 0 0 1 20 15v3h-6"/></svg>
             </div>
             <div class="absolute top-7 bg-background border border-border text-foreground text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
               ${reg}
             </div>
           </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

// Component to handle flying to selected marker
function MapController({ selectedPos }: { selectedPos: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (selectedPos) {
      map.flyTo([selectedPos.lat, selectedPos.lng], 14, { duration: 1.5 });
    }
  }, [selectedPos, map]);
  return null;
}

export default function LiveFleetMap({ compact = false, selectedVehicleId = null }: LiveFleetMapProps) {
  const [positions, setPositions] = useState<any>({});
  const [activePopup, setActivePopup] = useState<string | null>(null);

  // Initial fetch and 5s polling
  useEffect(() => {
    const fetchPos = () => {
      setPositions(gpsService.getFleetPositions());
    };
    fetchPos();
    const interval = setInterval(fetchPos, 5000);
    return () => clearInterval(interval);
  }, []);

  const getSafetyIcon = (score: number) => {
    if (score >= 90) return <ShieldCheck className="h-4 w-4 text-emerald-500" />;
    if (score >= 75) return <AlertCircle className="h-4 w-4 text-amber-500" />;
    return <ShieldAlert className="h-4 w-4 text-destructive" />;
  };

  const selectedPos = selectedVehicleId ? positions[selectedVehicleId] : null;

  return (
    <div className={`relative ${compact ? 'h-[400px]' : 'h-[calc(100vh-140px)]'} w-full rounded-xl overflow-hidden border border-border shadow-lg`}>
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
        
        <MapController selectedPos={selectedPos} />

        {Object.entries(positions).map(([vId, pos]: [string, any]) => {
          const info = gpsService.getDriverForVehicle(vId);
          if (!info) return null;
          const { vehicle, driver } = info;
          
          return (
            <Marker 
              key={vId} 
              position={[pos.lat, pos.lng]}
              icon={createMarkerIcon(vehicle.status, vehicle.registration_number)}
              eventHandlers={{
                click: () => setActivePopup(vId)
              }}
            >
              <Popup className="custom-popup" closeButton={false} minWidth={280}>
                <Card className="border-0 shadow-none bg-transparent">
                  <CardContent className="p-0 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-foreground m-0 p-0 leading-tight">{driver.name}</h4>
                        <span className="text-[10px] text-muted-foreground font-mono">{vehicle.registration_number} • {vehicle.model}</span>
                      </div>
                      <Badge variant="outline" className="bg-background flex gap-1">
                        {getSafetyIcon(driver.safety_score)}
                        <span className={driver.safety_score >= 90 ? 'text-emerald-500' : driver.safety_score >= 75 ? 'text-amber-500' : 'text-destructive'}>
                          {driver.safety_score}
                        </span>
                      </Badge>
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
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Package className="h-3 w-3"/> Load ({Math.round((pos.cargo_kg/pos.cargo_max)*100)}%)</span>
                        <span>{pos.cargo_kg}/{pos.cargo_max} kg</span>
                      </div>
                       <Progress value={(pos.cargo_kg/pos.cargo_max)*100}>
                         <ProgressTrack className="h-1.5">
                           <ProgressIndicator />
                         </ProgressTrack>
                       </Progress>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Fuel className="h-3 w-3"/> Fuel</span>
                        <span className={pos.fuel_percent < 20 ? 'text-destructive font-bold' : ''}>{pos.fuel_percent}%</span>
                      </div>
                       <Progress value={pos.fuel_percent}>
                         <ProgressTrack className="h-1.5">
                           <ProgressIndicator className={pos.fuel_percent < 20 ? 'bg-destructive' : 'bg-blue-500'} />
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

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-[400] bg-background/90 backdrop-blur border border-border p-2 rounded-lg shadow-lg flex gap-4 text-xs font-medium">
        <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-full bg-emerald-500"></div> On Trip</div>
        <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-full bg-blue-500"></div> Available</div>
        <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-full bg-red-500"></div> In Shop</div>
      </div>
    </div>
  );
}
