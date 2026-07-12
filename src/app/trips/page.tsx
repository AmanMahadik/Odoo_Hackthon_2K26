'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/db';
import { useRole } from '@/lib/roleContext';
import { useRealtimeSync } from '@/lib/useRealtimeSync';
import { Vehicle, Driver, Trip } from '@/lib/mockData';
import {
  Plus,
  Play,
  CheckCircle2,
  XCircle,
  MapPin,
  AlertTriangle,
  Trash2,
  Navigation,
  Truck,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ScrollArea } from '@/components/ui/scroll-area';

function TripsContent() {
  const searchParams = useSearchParams();
  const { canAccess, currency } = useRole();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [cargoWeight, setCargoWeight] = useState('');
  const [distance, setDistance] = useState('');
  const [formStatus, setFormStatus] = useState<'Draft' | 'Dispatched'>('Draft');
  const [errorMsg, setErrorMsg] = useState('');

  const [completeOpen, setCompleteOpen] = useState(false);
  const [completingTripId, setCompletingTripId] = useState('');
  const [actualDist, setActualDist] = useState('');
  const [fuelConsumed, setFuelConsumed] = useState('');
  const [fuelCost, setFuelCost] = useState('');
  const [completeError, setCompleteError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tList, vList, dList] = await Promise.all([
        db.getTrips(),
        db.getVehicles(),
        db.getDrivers(),
      ]);
      setTrips(tList);
      setVehicles(vList);
      setDrivers(dList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useRealtimeSync('trips', fetchData);

  useEffect(() => {
    fetchData();
    if (searchParams.get('new') === 'true') setIsOpen(true);
  }, [searchParams]);

  const availableVehicles = vehicles.filter((v) => v.status === 'Available');
  const availableDrivers = drivers.filter((d) => {
    return d.status === 'Available' && new Date(d.license_expiry_date) > new Date();
  });

  const resetCreateForm = () => {
    setSource('');
    setDestination('');
    setSelectedVehicleId('');
    setSelectedDriverId('');
    setCargoWeight('');
    setDistance('');
    setFormStatus('Draft');
    setErrorMsg('');
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!source || !destination || !selectedVehicleId || !selectedDriverId || !cargoWeight || !distance) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    const vehicle = vehicles.find((v) => v.id === selectedVehicleId);
    if (vehicle && Number(cargoWeight) > vehicle.max_load_capacity) {
      setErrorMsg(
        `Cargo weight (${cargoWeight}kg) exceeds vehicle max capacity (${vehicle.max_load_capacity}kg).`
      );
      return;
    }

    setSubmitting(true);
    try {
      await db.createTrip({
        source: source.trim(),
        destination: destination.trim(),
        vehicle_id: selectedVehicleId,
        driver_id: selectedDriverId,
        cargo_weight: Number(cargoWeight),
        planned_distance: Number(distance),
        status: formStatus,
      });
      resetCreateForm();
      setIsOpen(false);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating trip.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispatchDraft = async (t: Trip) => {
    const vehicle = vehicles.find((v) => v.id === t.vehicle_id);
    const driver = drivers.find((d) => d.id === t.driver_id);

    if (vehicle?.status !== 'Available') {
      alert(`Cannot dispatch: Vehicle ${vehicle?.registration_number} is ${vehicle?.status}.`);
      return;
    }
    if (driver?.status !== 'Available') {
      alert(`Cannot dispatch: Driver ${driver?.name} is ${driver?.status}.`);
      return;
    }
    if (driver && new Date(driver.license_expiry_date) < new Date()) {
      alert(`Cannot dispatch: Driver ${driver.name} license expired.`);
      return;
    }

    try {
      await db.updateTrip(t.id, { status: 'Dispatched' });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Dispatch failed.');
    }
  };

  const openCompleteModal = (t: Trip) => {
    setCompletingTripId(t.id);
    setActualDist(t.planned_distance.toString());
    const estimatedFuel = Math.round(t.planned_distance * 0.15);
    setFuelConsumed(estimatedFuel.toString());
    setFuelCost((estimatedFuel * 2.15).toFixed(2));
    setCompleteError('');
    setCompleteOpen(true);
  };

  const handleCompleteTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompleteError('');
    if (!actualDist || !fuelConsumed || !fuelCost) {
      setCompleteError('Please input completion metrics.');
      return;
    }

    setSubmitting(true);
    try {
      const trip = trips.find((x) => x.id === completingTripId);
      if (!trip) return;

      const vehicle = vehicles.find((v) => v.id === trip.vehicle_id);
      const newOdometer = (vehicle?.odometer || 0) + Number(actualDist);

      await db.updateTrip(completingTripId, {
        status: 'Completed',
        actual_distance: Number(actualDist),
      });
      await db.updateVehicle(trip.vehicle_id, { odometer: newOdometer });
      await db.createFuelLog({
        vehicle_id: trip.vehicle_id,
        trip_id: completingTripId,
        liters: Number(fuelConsumed),
        cost: Number(fuelCost),
        log_date: new Date().toISOString().split('T')[0],
      });

      setCompleteOpen(false);
      setCompletingTripId('');
      fetchData();
    } catch (err: any) {
      setCompleteError(err.message || 'Error completing trip.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelTrip = async (t: Trip) => {
    if (!confirm('Cancel this dispatched trip? Vehicle and driver return to Available.')) return;
    try {
      await db.updateTrip(t.id, { status: 'Cancelled' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTrip = async (t: Trip) => {
    if (!confirm('Permanently delete this trip log?')) return;
    try {
      await db.deleteTrip(t.id);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const statusLanes: Trip['status'][] = ['Draft', 'Dispatched', 'Completed', 'Cancelled'];

  const laneMeta: Record<
    Trip['status'],
    { title: string; badge: 'secondary' | 'default' | 'outline' | 'destructive' }
  > = {
    Draft: { title: 'Draft routes', badge: 'secondary' },
    Dispatched: { title: 'In transit', badge: 'default' },
    Completed: { title: 'Completed', badge: 'outline' },
    Cancelled: { title: 'Cancelled', badge: 'destructive' },
  };

  const canAct = canAccess('trips', 'dispatch') || canAccess('trips', 'update') || canAccess('trips', 'create');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Trip dispatch board</h2>
          <p className="text-sm text-muted-foreground">
            Enforces availability, license validity, and cargo capacity on dispatch
          </p>
        </div>
        {canAccess('trips', 'create') && (
          <Button onClick={() => setIsOpen(true)} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" /> Create trip
          </Button>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statusLanes.map((s) => (
          <Card key={s}>
            <CardContent className="pt-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{laneMeta[s].title}</p>
                <p className="text-2xl font-bold">{trips.filter((t) => t.status === s).length}</p>
              </div>
              <Navigation className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {statusLanes.map((status) => {
            const laneTrips = trips.filter((t) => t.status === status);
            return (
              <Card key={status} className="min-h-[420px] flex flex-col">
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm font-semibold">{laneMeta[status].title}</CardTitle>
                    <Badge variant={laneMeta[status].badge}>{laneTrips.length}</Badge>
                  </div>
                  {status === 'Dispatched' && (
                    <CardDescription className="text-[11px] flex items-center gap-1.5">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                      </span>
                      Live board
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-3 flex-1">
                  <ScrollArea className="h-[480px] pr-2">
                    <div className="space-y-3">
                      {laneTrips.length === 0 ? (
                        <p className="text-center py-10 text-xs text-muted-foreground">Empty lane</p>
                      ) : (
                        laneTrips.map((t) => (
                          <div
                            key={t.id}
                            className="rounded-xl border border-border bg-card p-3 space-y-3 shadow-sm"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 text-xs font-semibold">
                                <MapPin className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                <span className="truncate">{t.source}</span>
                              </div>
                              <div className="pl-5 text-[10px] text-muted-foreground">to</div>
                              <div className="flex items-center gap-2 text-xs font-semibold">
                                <MapPin className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                                <span className="truncate">{t.destination}</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-border pt-2">
                              <div>
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <Truck className="h-3 w-3" /> Vehicle
                                </span>
                                <span className="font-semibold block">
                                  {t.vehicle?.registration_number || '—'}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <User className="h-3 w-3" /> Driver
                                </span>
                                <span className="font-semibold block">{t.driver?.name || '—'}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Distance</span>
                                <span className="font-semibold block">{t.planned_distance} km</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Cargo</span>
                                <span className="font-semibold block">{t.cargo_weight} kg</span>
                              </div>
                            </div>

                            <div className="text-[10px] text-muted-foreground">
                              Trip #{t.trip_number}
                              {t.actual_distance != null && ` · actual ${t.actual_distance} km`}
                            </div>

                            {canAct && (
                              <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
                                {t.status === 'Draft' && canAccess('trips', 'dispatch') && (
                                  <Button
                                    size="sm"
                                    className="flex-1 h-8 text-[11px]"
                                    onClick={() => handleDispatchDraft(t)}
                                  >
                                    <Play className="h-3 w-3 mr-1" /> Dispatch
                                  </Button>
                                )}
                                {t.status === 'Dispatched' && canAccess('trips', 'update') && (
                                  <>
                                    <Button
                                      size="sm"
                                      className="flex-1 h-8 text-[11px]"
                                      onClick={() => openCompleteModal(t)}
                                    >
                                      <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 text-destructive"
                                      onClick={() => handleCancelTrip(t)}
                                      title="Cancel trip"
                                    >
                                      <XCircle className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                                {(canAccess('trips', 'delete') || canAccess('trips', 'update')) && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 text-destructive"
                                    onClick={() => handleDeleteTrip(t)}
                                    title="Delete"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create trip */}
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Plan transport route</DialogTitle>
            <DialogDescription>
              Only Available vehicles and drivers with valid licenses appear here.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTrip} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {errorMsg}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Source</Label>
                <Input value={source} onChange={(e) => setSource(e.target.value)} required placeholder="Warehouse A" />
              </div>
              <div className="space-y-2">
                <Label>Destination</Label>
                <Input
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  required
                  placeholder="Port Terminal 3"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Available vehicle</Label>
              <Select value={selectedVehicleId} onValueChange={(v) => v && setSelectedVehicleId(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {availableVehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.registration_number} — {v.model} (max {v.max_load_capacity}kg)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableVehicles.length === 0 && (
                <p className="text-[11px] text-destructive">No Available vehicles in registry.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Available driver</Label>
              <Select value={selectedDriverId} onValueChange={(v) => v && setSelectedDriverId(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose driver" />
                </SelectTrigger>
                <SelectContent>
                  {availableDrivers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} — score {d.safety_score} ({d.license_category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableDrivers.length === 0 && (
                <p className="text-[11px] text-destructive">No Available drivers with valid licenses.</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Cargo (kg)</Label>
                <Input
                  type="number"
                  required
                  min={0}
                  value={cargoWeight}
                  onChange={(e) => setCargoWeight(e.target.value)}
                  placeholder="500"
                />
              </div>
              <div className="space-y-2">
                <Label>Distance (km)</Label>
                <Input
                  type="number"
                  required
                  min={0}
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  placeholder="150"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Dispatch state</Label>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="formStatus"
                    checked={formStatus === 'Draft'}
                    onChange={() => setFormStatus('Draft')}
                    className="accent-primary"
                  />
                  Save as Draft
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="formStatus"
                    checked={formStatus === 'Dispatched'}
                    onChange={() => setFormStatus('Dispatched')}
                    className="accent-primary"
                  />
                  Dispatch now
                </label>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? 'Saving…' : 'Create route'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Complete trip */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Log trip completion</DialogTitle>
            <DialogDescription>
              Captures distance, fuel, and restores vehicle/driver to Available.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCompleteTrip} className="space-y-4">
            {completeError && (
              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {completeError}
              </div>
            )}
            <div className="space-y-2">
              <Label>Actual distance (km)</Label>
              <Input
                type="number"
                required
                value={actualDist}
                onChange={(e) => setActualDist(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Fuel (L)</Label>
                <Input
                  type="number"
                  required
                  value={fuelConsumed}
                  onChange={(e) => setFuelConsumed(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Fuel cost ({currency === 'INR' ? '₹' : '$'})</Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={fuelCost}
                  onChange={(e) => setFuelCost(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setCompleteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? 'Saving…' : 'Complete'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TripsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
        </div>
      }
    >
      <TripsContent />
    </Suspense>
  );
}
