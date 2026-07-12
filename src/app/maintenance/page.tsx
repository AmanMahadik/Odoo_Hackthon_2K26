'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { useRole } from '@/lib/roleContext';
import { useRealtimeSync } from '@/lib/useRealtimeSync';
import { Vehicle, MaintenanceLog } from '@/lib/mockData';
import {
  Plus,
  Wrench,
  CheckCircle,
  Clock,
  DollarSign,
  AlertTriangle,
  Search,
  Filter,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function MaintenancePage() {
  const { canAccess, formatCurrency, currency } = useRole();
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Closed'>('All');

  const [isOpen, setIsOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [closeOpen, setCloseOpen] = useState(false);
  const [closingLogId, setClosingLogId] = useState('');
  const [finalCost, setFinalCost] = useState('');
  const [closeError, setCloseError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mLogs, vList] = await Promise.all([db.getMaintenanceLogs(), db.getVehicles()]);
      setLogs(mLogs);
      setVehicles(vList.filter((v) => v.status !== 'Retired'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useRealtimeSync('maintenance_logs', fetchData);

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedVehicleId || !description || !estimatedCost) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    const vehicle = vehicles.find((v) => v.id === selectedVehicleId);
    if (vehicle && vehicle.status === 'On Trip') {
      setErrorMsg(
        `Vehicle ${vehicle.registration_number} is currently On Trip and cannot be checked into shop.`
      );
      return;
    }

    setSubmitting(true);
    try {
      await db.createMaintenanceLog({
        vehicle_id: selectedVehicleId,
        description: description.trim(),
        cost: Number(estimatedCost),
        status: 'Open',
      });
      setSelectedVehicleId('');
      setDescription('');
      setEstimatedCost('');
      setIsOpen(false);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error logging maintenance.');
    } finally {
      setSubmitting(false);
    }
  };

  const openCloseModal = (log: MaintenanceLog) => {
    setClosingLogId(log.id);
    setFinalCost(log.cost.toString());
    setCloseError('');
    setCloseOpen(true);
  };

  const handleCloseMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    setCloseError('');
    if (!finalCost) {
      setCloseError('Please enter final cost.');
      return;
    }
    setSubmitting(true);
    try {
      await db.updateMaintenanceLog(closingLogId, {
        status: 'Closed',
        cost: Number(finalCost),
        closed_at: new Date().toISOString(),
      });
      setCloseOpen(false);
      setClosingLogId('');
      fetchData();
    } catch (err: any) {
      setCloseError(err.message || 'Error closing log.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this maintenance log?')) return;
    try {
      await db.deleteMaintenanceLog(id);
      fetchData();
    } catch (err: any) {
      console.error(err);
    }
  };

    const filtered = logs.filter((log) => {
    if (statusFilter !== 'All' && log.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      log.description.toLowerCase().includes(q) ||
      log.vehicle?.registration_number?.toLowerCase().includes(q) ||
      log.vehicle?.model?.toLowerCase().includes(q)
    );
  });

  const openCount = logs.filter((l) => l.status === 'Open').length;
  const closedCount = logs.filter((l) => l.status === 'Closed').length;
  const totalCost = logs.reduce((s, l) => s + (l.cost || 0), 0);
  const openCost = logs.filter((l) => l.status === 'Open').reduce((s, l) => s + (l.cost || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Maintenance</h2>
          <p className="text-sm text-muted-foreground">
            Shop check-ins, service logs, and vehicle status transitions
          </p>
        </div>
        {canAccess('maintenance', 'create') && (
          <Button onClick={() => setIsOpen(true)} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" /> Log service
          </Button>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Open jobs</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openCount}</div>
            <p className="text-[10px] text-muted-foreground">Units currently In Shop</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Closed</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{closedCount}</div>
            <p className="text-[10px] text-muted-foreground">Completed services</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Open estimate</CardTitle>
            <DollarSign className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(openCost)}</div>
            <p className="text-[10px] text-muted-foreground">Pending close-out</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total spend</CardTitle>
            <Wrench className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCost)}</div>
            <p className="text-[10px] text-muted-foreground">All logged repairs</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vehicle or description…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as 'All' | 'Open' | 'Closed')}
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All statuses</SelectItem>
                <SelectItem value="Open">Open / In Shop</SelectItem>
                <SelectItem value="Closed">Closed / Serviced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Wrench className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium">No maintenance logs found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Adjust filters or log a new shop check-in
            </p>
            {canAccess('maintenance', 'create') && (
              <Button className="mt-4" size="sm" onClick={() => setIsOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Log service
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Opened</TableHead>
                  <TableHead>Closed</TableHead>
                  <TableHead>Status</TableHead>
                  {(canAccess('maintenance', 'update') || canAccess('maintenance', 'delete')) && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="font-semibold">
                        {log.vehicle?.registration_number || 'Unknown'}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {log.vehicle?.model || ''}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <span className="line-clamp-2 text-muted-foreground">{log.description}</span>
                    </TableCell>
                    <TableCell className="font-mono font-medium">
                      {formatCurrency(log.cost)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(log.opened_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.closed_at ? new Date(log.closed_at).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell>
                      {log.status === 'Open' ? (
                        <Badge variant="destructive" className="gap-1">
                          <Clock className="h-3 w-3" /> In Shop
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        >
                          <CheckCircle className="h-3 w-3" /> Serviced
                        </Badge>
                      )}
                    </TableCell>
                    {(canAccess('maintenance', 'update') || canAccess('maintenance', 'delete')) && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {log.status === 'Open' && canAccess('maintenance', 'update') && (
                            <Button size="sm" variant="outline" onClick={() => openCloseModal(log)}>
                              Close log
                            </Button>
                          )}
                          {canAccess('maintenance', 'delete') && (
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteLog(log.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Open log dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log shop check-in</DialogTitle>
            <DialogDescription>
              Opens a maintenance ticket and sets the vehicle to In Shop
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleOpenMaintenance} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label>Vehicle</Label>
              <Select value={selectedVehicleId} onValueChange={(v) => v && setSelectedVehicleId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.registration_number} — {v.model} ({v.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                required
                placeholder="Diagnostics, parts, symptoms…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label>Estimated cost ({currency === 'INR' ? '₹' : '$'})</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  required
                  min={0}
                  placeholder="350"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? 'Saving…' : 'Open log'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Close log dialog */}
      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Close service log</DialogTitle>
            <DialogDescription>
              Releases the vehicle and posts the repair cost to expenses
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCloseMaintenance} className="space-y-4">
            {closeError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{closeError}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label>Final service cost ({currency === 'INR' ? '₹' : '$'})</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  required
                  min={0}
                  value={finalCost}
                  onChange={(e) => setFinalCost(e.target.value)}
                  className="pl-9 font-semibold"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setCloseOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? 'Closing…' : 'Complete service'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
