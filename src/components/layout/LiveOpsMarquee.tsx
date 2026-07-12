'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { gpsService } from '@/lib/mockServices';

type TickerItem = {
  label: string;
  value: string;
  href: string;
};

/**
 * Live ops strip — values always derived from sandbox/DB (no static demo numbers).
 * Aligns vehicle On Trip count with dispatched trips + GPS layer when possible.
 */
export default function LiveOpsMarquee() {
  const [items, setItems] = useState<TickerItem[]>([]);

  const load = useCallback(async () => {
    try {
      const [vehicles, drivers, trips, maintenance] = await Promise.all([
        db.getVehicles(),
        db.getDrivers(),
        db.getTrips(),
        db.getMaintenanceLogs(),
      ]);

      // Keep GPS layer consistent so marquee “en route” matches the map
      gpsService.syncDispatchedTrips(trips);

      const fleet = vehicles.filter((v) => v.status !== 'Retired' && v.status !== 'Pending');
      const onTripVehicles = fleet.filter((v) => v.status === 'On Trip').length;
      const available = fleet.filter((v) => v.status === 'Available').length;
      const inShop = fleet.filter((v) => v.status === 'In Shop').length;
      const pendingApproval = vehicles.filter((v) => v.status === 'Pending').length;

      const liveTrips = trips.filter((t) => t.status === 'Dispatched').length;
      const draftTrips = trips.filter((t) => t.status === 'Draft').length;

      // Prefer vehicle status; fall back to live trip count if statuses lag
      const enRoute = Math.max(onTripVehicles, liveTrips);
      const mapDispatched = gpsService.getActiveDispatchCount();

      const driversOnTrip = drivers.filter((d) => d.status === 'On Trip').length;
      const driversAvailable = drivers.filter((d) => d.status === 'Available').length;
      const driversPending = drivers.filter(
        (d) => d.status === 'Pending' || d.status === 'Inactive'
      ).length;

      const openMaint = maintenance.filter((m) => m.status === 'Open').length;
      const util =
        fleet.length > 0 ? Math.round((onTripVehicles / fleet.length) * 100) : 0;

      setItems([
        { label: 'En route', value: String(enRoute), href: '/trips' },
        { label: 'Live trips', value: String(liveTrips), href: '/trips' },
        { label: 'Map tracks', value: String(mapDispatched || enRoute), href: '/' },
        { label: 'Available units', value: String(available), href: '/vehicles' },
        { label: 'In shop', value: String(inShop), href: '/maintenance' },
        { label: 'Draft trips', value: String(draftTrips), href: '/trips' },
        { label: 'Drivers on trip', value: String(driversOnTrip), href: '/drivers' },
        { label: 'Drivers free', value: String(driversAvailable), href: '/drivers' },
        ...(driversPending > 0
          ? [{ label: 'Driver approvals', value: String(driversPending), href: '/drivers' }]
          : []),
        ...(pendingApproval > 0
          ? [{ label: 'Vehicle pending', value: String(pendingApproval), href: '/vehicles' }]
          : []),
        { label: 'Open maintenance', value: String(openMaint), href: '/maintenance' },
        { label: 'Fleet util', value: `${util}%`, href: '/reports' },
        { label: 'Fleet size', value: String(fleet.length), href: '/vehicles' },
      ]);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 4000);
    const onOps = () => load();
    window.addEventListener('transitops:ops', onOps);
    window.addEventListener('storage', onOps);
    return () => {
      clearInterval(id);
      window.removeEventListener('transitops:ops', onOps);
      window.removeEventListener('storage', onOps);
    };
  }, [load]);

  const display: TickerItem[] =
    items.length > 0
      ? items
      : Array.from({ length: 6 }).map(() => ({
          label: 'Syncing',
          value: '…',
          href: '/',
        }));

  // Single loop copy is enough; CSS marquee repeats visually without fake data
  const loop = [...display, ...display];

  return (
    <div className="w-full shrink-0 border-b border-border bg-muted/25">
      <div className="w-full max-w-[1600px] mx-auto px-4 md:px-6">
        <div className="relative flex h-7 items-center overflow-hidden">
          <div className="z-20 flex h-7 shrink-0 items-center gap-1.5 pr-2.5 mr-1 border-r border-border/80">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground font-normal leading-none">
              Live
            </span>
          </div>

          <div className="relative h-7 min-w-0 flex-1 overflow-hidden">
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-muted/40 to-transparent" />
            <div className="transitops-marquee-track h-7 items-center">
              {loop.map((item, i) => (
                <Link
                  key={`${item.label}-${item.value}-${i}`}
                  href={item.href}
                  className="inline-flex h-7 shrink-0 items-center gap-1.5 px-2.5 text-[11px] leading-none text-foreground/85 hover:text-foreground font-normal whitespace-nowrap"
                >
                  <span className="text-muted-foreground font-normal">{item.label}</span>
                  <span className="tabular-nums font-normal text-foreground/90">{item.value}</span>
                  <span className="text-muted-foreground/30 pl-1">·</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
