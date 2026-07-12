'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';
import type { AppNotification, Driver, Vehicle } from '@/lib/mockData';
import { useRole } from '@/lib/roleContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Eye,
  ScanText,
  ImageIcon,
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

const DRIVER_OCR_KEYS: { key: string; label: string }[] = [
  { key: 'name', label: 'Full name' },
  { key: 'license_number', label: 'License number' },
  { key: 'license_category', label: 'Category' },
  { key: 'license_expiry_date', label: 'Expiry date' },
  { key: 'contact_number', label: 'Contact' },
];

const VEHICLE_OCR_KEYS: { key: string; label: string }[] = [
  { key: 'registration_number', label: 'Registration' },
  { key: 'registration', label: 'Registration' },
  { key: 'model', label: 'Model' },
  { key: 'type', label: 'Type' },
  { key: 'capacity', label: 'Capacity (kg)' },
  { key: 'max_load_capacity', label: 'Capacity (kg)' },
  { key: 'odometer', label: 'Odometer (km)' },
];

function FieldRow({ label, value }: { label: string; value?: string | number }) {
  if (value === undefined || value === '' || value === null) return null;
  return (
    <div className="flex justify-between gap-3 py-1.5 border-b border-border/60 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-medium text-right tabular-nums break-all">{String(value)}</span>
    </div>
  );
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
  const [reviewItem, setReviewItem] = useState<AppNotification | null>(null);
  const [entityDriver, setEntityDriver] = useState<Driver | null>(null);
  const [entityVehicle, setEntityVehicle] = useState<Vehicle | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

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

  const openReview = async (n: AppNotification) => {
    setReviewItem(n);
    setEntityDriver(null);
    setEntityVehicle(null);
    setReviewLoading(true);
    try {
      if (!n.read) await db.markNotificationRead(n.id);
      if (n.entity_type === 'driver' && n.entity_id) {
        const d = await db.getDriverById(n.entity_id);
        setEntityDriver(d);
      }
      if (n.entity_type === 'vehicle' && n.entity_id) {
        const v = await db.getVehicleById(n.entity_id);
        setEntityVehicle(v);
      }
      load();
    } catch (e) {
      console.error(e);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleResolve = async (n: AppNotification, decision: 'approved' | 'rejected') => {
    if (!n.id) return;
    setBusyId(n.id);
    try {
      await db.resolveApproval(n.id, decision);
      setReviewItem(null);
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkAll = async () => {
    await db.markAllNotificationsRead();
    load();
  };

  const docUrl = useMemo(() => {
    if (!reviewItem) return undefined;
    if (entityDriver?.license_doc_url) return entityDriver.license_doc_url;
    if (entityVehicle?.registration_doc_url) return entityVehicle.registration_doc_url;
    const m = reviewItem.meta?.doc;
    return typeof m === 'string' ? m : undefined;
  }, [reviewItem, entityDriver, entityVehicle]);

  const ocrFields = useMemo(() => {
    if (!reviewItem) return [] as { label: string; value: string }[];
    const snap =
      entityDriver?.ocr_snapshot ||
      entityVehicle?.ocr_snapshot ||
      (reviewItem.meta as Record<string, string | number | undefined>) ||
      {};

    const keys =
      reviewItem.type === 'driver_approval' ? DRIVER_OCR_KEYS : VEHICLE_OCR_KEYS;

    const seen = new Set<string>();
    const rows: { label: string; value: string }[] = [];

    for (const { key, label } of keys) {
      const raw = snap[key] ?? reviewItem.meta?.[key];
      if (raw === undefined || raw === '') continue;
      if (seen.has(label)) continue;
      seen.add(label);
      rows.push({ label, value: String(raw) });
    }

    // Fallback: any remaining meta keys except doc
    if (rows.length === 0 && reviewItem.meta) {
      for (const [k, v] of Object.entries(reviewItem.meta)) {
        if (k === 'doc' || v === undefined || v === '') continue;
        rows.push({
          label: k.replace(/_/g, ' '),
          value: String(v),
        });
      }
    }

    return rows;
  }, [reviewItem, entityDriver, entityVehicle]);

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-200 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => onOpenChange(false)}
        aria-hidden={!open}
      />

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

                return (
                  <div
                    key={n.id}
                    className={`rounded-xl border border-border p-3 space-y-2.5 transition-colors ${
                      n.read ? 'bg-background' : 'bg-muted/40'
                    }`}
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
                              Approved · Active
                            </Badge>
                          )}
                          {n.action_status === 'rejected' && (
                            <Badge variant="destructive" className="text-[9px] font-normal h-5">
                              Rejected
                            </Badge>
                          )}
                          {n.action_status === 'open' && isApproval && (
                            <Badge variant="outline" className="text-[9px] font-normal h-5">
                              Not active
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-snug">{n.text}</p>
                        <span className="text-[10px] text-muted-foreground/80 mt-1 block">
                          {n.time}
                        </span>
                      </div>
                    </div>

                    {isApproval && canApprove && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full h-8 gap-1.5 font-normal"
                        onClick={() => openReview(n)}
                      >
                        <Eye className="h-3.5 w-3.5" /> Review application
                      </Button>
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
          Drivers & vehicles stay inactive until fleet manager reviews and accepts
        </div>
      </aside>

      {/* Review popup — image + OCR + accept/reject */}
      <Dialog
        open={!!reviewItem}
        onOpenChange={(o) => {
          if (!o) setReviewItem(null);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-medium text-base">
              {reviewItem?.type === 'driver_approval'
                ? 'Review driver activation'
                : 'Review vehicle registration'}
            </DialogTitle>
            <DialogDescription className="font-normal">
              Compare the uploaded document with OCR-extracted values, then accept to activate or
              reject to keep inactive.
            </DialogDescription>
          </DialogHeader>

          {reviewLoading ? (
            <div className="py-12 flex justify-center">
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Uploaded image */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <ImageIcon className="h-3.5 w-3.5" /> Uploaded document
                </div>
                <div className="rounded-xl border border-border bg-muted/30 overflow-hidden min-h-[160px] flex items-center justify-center">
                  {docUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={docUrl}
                      alt="Uploaded document"
                      className="max-h-[240px] w-full object-contain bg-background"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground py-10 px-4 text-center">
                      No image attached to this request
                    </p>
                  )}
                </div>
              </div>

              {/* OCR extracted */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <ScanText className="h-3.5 w-3.5" /> OCR / form extracted values
                </div>
                <div className="rounded-xl border border-border p-3 bg-card">
                  {ocrFields.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No extracted fields available</p>
                  ) : (
                    ocrFields.map((f) => (
                      <FieldRow key={f.label} label={f.label} value={f.value} />
                    ))
                  )}
                </div>
              </div>

              {reviewItem && canApprove && reviewItem.action_status === 'open' && (
                <div className="flex gap-2 pt-1">
                  <Button
                    className="flex-1 gap-1.5 font-normal"
                    disabled={busyId === reviewItem.id}
                    onClick={() => handleResolve(reviewItem, 'approved')}
                  >
                    <Check className="h-4 w-4" /> Accept & activate
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-1.5 font-normal"
                    disabled={busyId === reviewItem.id}
                    onClick={() => handleResolve(reviewItem, 'rejected')}
                  >
                    <XCircle className="h-4 w-4" /> Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
