'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';
import type { AppNotification } from '@/lib/mockData';
import { useRole } from '@/lib/roleContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Bell,
  X,
  Check,
  XCircle,
  Users,
  Truck,
  Navigation,
  Wrench,
  AlertTriangle,
  FileText,
  ExternalLink,
} from 'lucide-react';

interface NotificationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCountChange?: (unread: number) => void;
}

function typeIcon(type: AppNotification['type']) {
  switch (type) {
    case 'driver_approval':
      return <Users className="h-4 w-4" />;
    case 'vehicle_approval':
      return <Truck className="h-4 w-4" />;
    case 'dispatch':
    case 'trip':
      return <Navigation className="h-4 w-4" />;
    case 'maintenance':
      return <Wrench className="h-4 w-4" />;
    case 'expiry':
      return <AlertTriangle className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

function typeLabel(type: AppNotification['type']) {
  switch (type) {
    case 'driver_approval':
      return 'Driver approval';
    case 'vehicle_approval':
      return 'Vehicle approval';
    case 'dispatch':
      return 'Dispatch';
    case 'trip':
      return 'Trip';
    case 'maintenance':
      return 'Maintenance';
    case 'expiry':
      return 'License';
    default:
      return 'System';
  }
}

export default function NotificationDrawer({
  open,
  onOpenChange,
  onCountChange,
}: NotificationDrawerProps) {
  const { role, canAccess } = useRole();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const canApprove =
    role === 'Fleet Manager' || role === 'Safety Officer' || canAccess('drivers', 'update');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await db.getNotifications();
      setItems(list);
      const unread = list.filter(
        (n) => !n.read && (n.action_status === 'open' || n.action_status === 'info')
      ).length;
      onCountChange?.(unread);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const handleMarkAll = async () => {
    await db.markAllNotificationsRead();
    load();
  };

  const handleResolve = async (n: AppNotification, decision: 'approved' | 'rejected') => {
    if (!n.id) return;
    setBusyId(n.id);
    try {
      await db.resolveApproval(n.id, decision);
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setBusyId(null);
    }
  };

  const handleOpenItem = async (n: AppNotification) => {
    if (!n.read) {
      await db.markNotificationRead(n.id);
      load();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-200 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => onOpenChange(false)}
        aria-hidden={!open}
      />

      {/* Right slide panel */}
      <aside
        className={`fixed top-0 right-0 z-[70] h-full w-full max-w-md bg-background border-l border-border shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-label="Notifications"
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Bell className="h-4 w-4 shrink-0" />
            <div>
              <h2 className="text-sm font-medium leading-none">Notifications</h2>
              <p className="text-[11px] text-muted-foreground mt-1 font-normal">
                Approvals, dispatch, and fleet alerts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs font-normal"
              onClick={handleMarkAll}
            >
              Mark all read
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-3 space-y-2">
            {loading && items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">Loading…</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">
                No notifications right now
              </p>
            ) : (
              items.map((n) => {
                const isApproval =
                  (n.type === 'driver_approval' || n.type === 'vehicle_approval') &&
                  n.action_status === 'open';
                const docUrl =
                  typeof n.meta?.doc === 'string' ? n.meta.doc : undefined;

                return (
                  <div
                    key={n.id}
                    className={`rounded-xl border border-border p-3 space-y-2.5 transition-colors ${
                      n.read ? 'bg-background' : 'bg-muted/40'
                    }`}
                    onClick={() => handleOpenItem(n)}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-md border border-border bg-muted shrink-0 text-foreground">
                        {typeIcon(n.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium leading-tight">{n.title}</span>
                          <Badge variant="outline" className="text-[9px] font-normal h-5">
                            {typeLabel(n.type)}
                          </Badge>
                          {n.action_status === 'approved' && (
                            <Badge variant="secondary" className="text-[9px] font-normal h-5">
                              Approved
                            </Badge>
                          )}
                          {n.action_status === 'rejected' && (
                            <Badge variant="destructive" className="text-[9px] font-normal h-5">
                              Rejected
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-snug">{n.text}</p>
                        <span className="text-[10px] text-muted-foreground/80 mt-1 block">
                          {n.time}
                        </span>
                      </div>
                    </div>

                    {docUrl && (
                      <a
                        href={docUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-foreground underline-offset-2 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FileText className="h-3 w-3" /> View uploaded document
                      </a>
                    )}

                    {isApproval && canApprove && (
                      <div className="flex gap-2 pt-0.5" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          className="h-8 flex-1 gap-1.5 font-normal"
                          disabled={busyId === n.id}
                          onClick={() => handleResolve(n, 'approved')}
                        >
                          <Check className="h-3.5 w-3.5" /> Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 flex-1 gap-1.5 font-normal"
                          disabled={busyId === n.id}
                          onClick={() => handleResolve(n, 'rejected')}
                        >
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </Button>
                      </div>
                    )}

                    {n.type === 'dispatch' && n.entity_id && (
                      <Link
                        href="/trips"
                        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                        onClick={() => onOpenChange(false)}
                      >
                        Open dispatch board <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        <Separator />
        <div className="p-3 shrink-0 text-[10px] text-muted-foreground text-center">
          Driver activation & vehicle registration require fleet manager acceptance
        </div>
      </aside>
    </>
  );
}
