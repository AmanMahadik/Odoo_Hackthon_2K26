'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/db';
import { useRole } from '@/lib/roleContext';
import { useRealtimeSync } from '@/lib/useRealtimeSync';
import { Vehicle } from '@/lib/mockData';
import { 
  Plus, 
  Search, 
  Filter, 
  Truck, 
  Edit3, 
  Trash2, 
  AlertCircle,
  FileText,
  X,
  CheckCircle2
} from 'lucide-react';
import { LicensePlateScanner } from '@/components/ocr/LicensePlateScanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

function VehiclesContent() {
  const searchParams = useSearchParams();
  const { canAccess } = useRole();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  
  // Form modal state
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [regNum, setRegNum] = useState('');
  const [model, setModel] = useState('');
  const [type, setType] = useState<'Van' | 'Truck' | 'Bike' | 'Car' | 'Bus'>('Van');
  const [capacity, setCapacity] = useState('');
  const [odometer, setOdometer] = useState('');
  const [cost, setCost] = useState('');
  const [status, setStatus] = useState<Vehicle['status']>('Available');
  const [errorMsg, setErrorMsg] = useState('');
  const [isOCRValidated, setIsOCRValidated] = useState(false);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const data = await db.getVehicles();
      setVehicles(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
    if (searchParams.get('add') === 'true') setIsOpen(true);
  }, [searchParams]);

  useRealtimeSync('vehicles', fetchVehicles);

  const resetForm = () => {
    setRegNum('');
    setModel('');
    setCapacity('');
    setOdometer('');
    setCost('');
    setType('Van');
    setStatus('Available');
    setEditingId(null);
    setIsOCRValidated(false);
    setErrorMsg('');
  };

  const openCreate = () => {
    resetForm();
    setIsOpen(true);
  };

  const openEdit = (v: Vehicle) => {
    setEditingId(v.id);
    setRegNum(v.registration_number);
    setModel(v.model);
    setType(v.type);
    setCapacity(String(v.max_load_capacity));
    setOdometer(String(v.odometer));
    setCost(String(v.acquisition_cost));
    setStatus(v.status);
    setIsOCRValidated(false);
    setErrorMsg('');
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!regNum || !model || !capacity || !odometer || !cost) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    const exists = vehicles.some(
      (v) =>
        v.registration_number.toLowerCase() === regNum.trim().toLowerCase() &&
        v.id !== editingId
    );
    if (exists) {
      setErrorMsg(`Vehicle with registration number ${regNum} already exists.`);
      return;
    }

    try {
      const payload = {
        registration_number: regNum.trim().toUpperCase(),
        model: model.trim(),
        type,
        max_load_capacity: Number(capacity),
        odometer: Number(odometer),
        acquisition_cost: Number(cost),
        status,
      };

      if (editingId) {
        await db.updateVehicle(editingId, payload);
      } else {
        await db.createVehicle({ ...payload, status: 'Available' });
      }

      resetForm();
      setIsOpen(false);
      fetchVehicles();
    } catch (err: any) {
      let msg = err.message || 'Error saving vehicle.';
      if (msg.includes('duplicate key') || msg.includes('vehicles_registration_number_key') || err.code === '23505') {
        msg = `A vehicle with registration number ${regNum.toUpperCase()} already exists in the database.`;
      } else if (msg.includes('row-level security') || err.code === '42501') {
        msg = 'Permission denied: Only Fleet Managers are authorized to manage vehicles.';
      }
      setErrorMsg(msg);
    }
  };

  const handleOCRAutoFill = (data: any) => {
    setRegNum(data.registration_number);
    setModel(data.model);
    if (['Van', 'Truck', 'Bike', 'Car', 'Bus'].includes(data.type)) {
      setType(data.type as any);
    }
    setIsOCRValidated(true);
  };

  const handleRetire = async (id: string) => {
    if (!confirm('Are you sure you want to retire this vehicle?')) return;
    try {
      await db.updateVehicle(id, { status: 'Retired' });
      fetchVehicles();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;
    try {
      await db.deleteVehicle(id);
      fetchVehicles();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = v.registration_number.toLowerCase().includes(searchTerm.toLowerCase()) || v.model.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || v.status === statusFilter;
    const matchesType = typeFilter === 'All' || v.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: Vehicle['status']) => {
    switch (status) {
      case 'Available': return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">Available</Badge>;
      case 'On Trip': return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">On Trip</Badge>;
      case 'In Shop': return <Badge variant="secondary" className="bg-destructive/10 text-destructive hover:bg-destructive/20">In Shop</Badge>;
      case 'Retired': return <Badge variant="secondary">Retired</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Vehicle Registry</h2>
          <p className="text-sm text-muted-foreground">Master database of all logistics transport units</p>
        </div>
        
        {canAccess('vehicles', 'create') && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Add Vehicle
          </Button>
        )}
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4 space-y-4">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by registration or model..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={(val) => val && setStatusFilter(val)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="On Trip">On Trip</SelectItem>
                <SelectItem value="In Shop">In Shop</SelectItem>
                <SelectItem value="Retired">Retired</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={(val) => val && setTypeFilter(val)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Vehicle Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Types</SelectItem>
                <SelectItem value="Truck">Truck</SelectItem>
                <SelectItem value="Van">Van</SelectItem>
                <SelectItem value="Bus">Bus</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Shadcn Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Registration</TableHead>
                  <TableHead>Vehicle Details</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Odometer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">Loading vehicles...</TableCell>
                  </TableRow>
                ) : filteredVehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">No vehicles found.</TableCell>
                  </TableRow>
                ) : (
                  filteredVehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-mono font-bold text-sm">
                        {vehicle.registration_number}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm">{vehicle.model}</span>
                          <span className="text-xs text-muted-foreground">{vehicle.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>{vehicle.max_load_capacity} kg</TableCell>
                      <TableCell>{vehicle.odometer.toLocaleString()} km</TableCell>
                      <TableCell>{getStatusBadge(vehicle.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {canAccess('vehicles', 'update') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Edit vehicle"
                              onClick={() => openEdit(vehicle)}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          )}
                          {canAccess('vehicles', 'update') && vehicle.status !== 'Retired' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Retire vehicle"
                              onClick={() => handleRetire(vehicle.id)}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          )}
                          {canAccess('vehicles', 'delete') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteVehicle(vehicle.id)}
                              title="Delete vehicle"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Vehicle' : 'Register New Vehicle'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Update registry fields and operational status.'
                : 'Use the AI scanner to auto-fill plate details, or enter manually.'}
            </DialogDescription>
          </DialogHeader>
          {!editingId && (
            <div className="flex justify-end mt-2">
              <LicensePlateScanner onAutoFill={handleOCRAutoFill} />
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md flex gap-2">
                <AlertCircle className="h-4 w-4" /> {errorMsg}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Registration Number</label>
              <div className="flex gap-2 items-center">
                <Input
                  value={regNum}
                  onChange={(e) => setRegNum(e.target.value)}
                  required
                  placeholder="MH12AB1234"
                  disabled={!!editingId}
                />
                {isOCRValidated && (
                  <Badge className="bg-emerald-500 hover:bg-emerald-600 h-9 rounded-md px-3 flex gap-1">
                    <CheckCircle2 className="h-4 w-4" /> Verified
                  </Badge>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Model</label>
                <Input value={model} onChange={(e) => setModel(e.target.value)} required placeholder="e.g. Ford Transit" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Vehicle Type</label>
                <Select value={type} onValueChange={(v: any) => v && setType(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Truck">Truck</SelectItem>
                    <SelectItem value="Van">Van</SelectItem>
                    <SelectItem value="Bus">Bus</SelectItem>
                    <SelectItem value="Car">Car</SelectItem>
                    <SelectItem value="Bike">Bike</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Load Capacity (kg)</label>
                <Input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} required placeholder="1500" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Odometer (km)</label>
                <Input type="number" value={odometer} onChange={(e) => setOdometer(e.target.value)} required placeholder="12500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Acquisition Cost ($)</label>
                <Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} required placeholder="45000" />
              </div>
              {editingId && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={status} onValueChange={(v: any) => v && setStatus(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Available">Available</SelectItem>
                      <SelectItem value="On Trip">On Trip</SelectItem>
                      <SelectItem value="In Shop">In Shop</SelectItem>
                      <SelectItem value="Retired">Retired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingId ? 'Save changes' : 'Save Vehicle'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function VehiclesPage() {
  return (
    <Suspense fallback={<div className="p-8 flex justify-center"><div className="animate-pulse flex items-center gap-2"><Truck className="h-6 w-6 text-primary" /> Loading registry...</div></div>}>
      <VehiclesContent />
    </Suspense>
  );
}
