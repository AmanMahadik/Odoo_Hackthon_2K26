'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';

type TickerItem = {
  label: string;
  value: string;
  href: string;
};

export default function LiveOpsMarquee() {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [vehicles, drivers, trips, maintenance] = await Promise.all([
          db.getVehicles(),
          db.getDrivers(),
          db.getTrips(),
          db.getMaintenanceLogs(),
        ]);
        if (cancelled) return;

        const active = vehicles.filter((v) => v.status !== 'Retired');
        const onTrip = vehicles.filter((v) => v.status === 'On Trip').length;
        const available = vehicles.filter((v) => v.status === 'Available').length;
        const inShop = vehicles.filter((v) => v.status === 'In Shop').length;
        const liveTrips = trips.filter((t) => t.status === 'Dispatched').length;
        const pending = trips.filter((t) => t.status === 'Draft').length;
        const onDuty = drivers.filter((d) => d.status === 'On Trip').length;
        const openMaint = maintenance.filter((m) => m.status === 'Open').length;
        const util =
          active.length > 0 ? Math.round((onTrip / active.length) * 100) : 0;

        setItems([
          { label: 'Active vehicles', value: String(onTrip), href: '/vehicles' },
          { label: 'Available', value: String(available), href: '/vehicles' },
          { label: 'In shop', value: String(inShop), href: '/maintenance' },
          { label: 'Live trips', value: String(liveTrips), href: '/trips' },
          { label: 'Pending trips', value: String(pending), href: '/trips' },
          { label: 'Drivers on duty', value: String(onDuty), href: '/drivers' },
          { label: 'Open maintenance', value: String(openMaint), href: '/maintenance' },
          { label: 'Fleet utilization', value: `${util}%`, href: '/reports' },
        ]);
      } catch (err) {
        console.error(err);
      }
    }

    load();
    const id = setInterval(load, 12000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const display: TickerItem[] =
    items.length > 0
      ? items
      : Array.from({ length: 8 }).map(() => ({
          label: 'Loading',
          value: '—',
          href: '/',
        }));

  const loop = [...display, ...display, ...display];

  return (
    <div className="w-full shrink-0 border-b border-border bg-muted/30">
      {/* Single fixed row — never wraps/collapses */}
      <div className="relative flex h-8 items-center overflow-hidden whitespace-nowrap">
        <div className="z-20 flex h-8 shrink-0 items-center gap-1.5 border-r border-border bg-muted/90 px-3 text-[10px] tracking-wider text-muted-foreground">
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          <span className="leading-none">LIVE</span>
        </div>

        <div className="relative h-8 min-w-0 flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-muted/40 to-transparent" />
          <div className="transitops-marquee-track h-8 items-center">
            {loop.map((item, i) => (
              <Link
                key={`${item.label}-${i}`}
                href={item.href}
                className="inline-flex h-8 shrink-0 items-center gap-2 px-3 text-[12px] leading-none text-foreground/90 hover:text-foreground font-normal"
              >
                <span className="text-muted-foreground font-normal leading-none">{item.label}</span>
                <span className="tabular-nums font-normal leading-none">{item.value}</span>
                <span className="text-muted-foreground/35 leading-none">·</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
