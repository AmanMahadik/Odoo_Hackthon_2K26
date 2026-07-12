'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { useRole } from '@/lib/roleContext';
import { Driver } from '@/lib/mockData';
import { 
  Plus, 
  Search, 
  Users, 
  Edit3, 
  Trash2, 
  AlertCircle,
  FileText,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { DriverLicenseScanner } from '@/components/ocr/DriverLicenseScanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export default function DriversPage() {
  const { canAccess } = useRole();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form modal state
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [licenseNum, setLicenseNum] = useState('');
  const [licenseType, setLicenseType] = useState('');
  const [contact, setContact] = useState('');
  const [expiry, setExpiry] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isOCRValidated, setIsOCRValidated] = useState(false);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const data = await db.getDrivers();
      setDrivers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name || !licenseNum || !licenseType || !contact || !expiry) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    try {
      await db.createDriver({
        name: name.trim(),
        license_number: licenseNum.trim().toUpperCase(),
        license_category: licenseType,
        contact_number: contact,
        license_expiry_date: expiry,
        status: 'Available',
        safety_score: 100 // default for new drivers
      });
      
      setName(''); setLicenseNum(''); setLicenseType(''); setContact(''); setExpiry(''); setIsOCRValidated(false);
      setIsOpen(false);
      fetchDrivers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating driver.');
    }
  };

  const handleOCRAutoFill = (data: any) => {
    setName(data.name);
    setLicenseNum(data.license_number);
    setLicenseType(data.license_category);
    setExpiry(data.license_expiry_date);
    setIsOCRValidated(true);
  };

  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.license_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: Driver['status']) => {
    switch (status) {
      case 'Available': return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">Available</Badge>;
      case 'On Trip': return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">On Trip</Badge>;
      case 'Off Duty': return <Badge variant="secondary" className="bg-slate-500/10 text-slate-500 hover:bg-slate-500/20">Off Duty</Badge>;
    }
  };

  const getSafetyBadge = (score: number) => {
    if (score >= 90) return <Badge variant="outline" className="text-emerald-500 border-emerald-500/50 gap-1"><ShieldCheck className="h-3 w-3"/> {score}</Badge>;
    if (score >= 75) return <Badge variant="outline" className="text-amber-500 border-amber-500/50 gap-1"><AlertCircle className="h-3 w-3"/> {score}</Badge>;
    return <Badge variant="outline" className="text-destructive border-destructive/50 gap-1"><ShieldAlert className="h-3 w-3"/> {score}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Driver Personnel</h2>
          <p className="text-sm text-muted-foreground">Manage drivers, licenses, and safety scores</p>
        </div>
        
        {canAccess('drivers', 'create') && (
          <Button onClick={() => setIsOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Driver
          </Button>
        )}
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4 space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or license..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver Name</TableHead>
                  <TableHead>License Details</TableHead>
                  <TableHead>Safety Score</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">Loading drivers...</TableCell>
                  </TableRow>
                ) : filteredDrivers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">No drivers found.</TableCell>
                  </TableRow>
                ) : (
                  filteredDrivers.map((driver) => (
                    <TableRow key={driver.id}>
                      <TableCell className="font-semibold">{driver.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-mono text-sm">{driver.license_number}</span>
                          <span className="text-xs text-muted-foreground">Exp: {driver.license_expiry_date} • {driver.license_category}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getSafetyBadge(driver.safety_score)}</TableCell>
                      <TableCell>{driver.contact_number}</TableCell>
                      <TableCell>{getStatusBadge(driver.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon">
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Edit3 className="h-4 w-4" />
                          </Button>
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

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Register New Driver</DialogTitle>
            <DialogDescription>Scan a driver's license to auto-fill Govt details, or enter manually.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-2">
            <DriverLicenseScanner onAutoFill={handleOCRAutoFill} />
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md flex gap-2">
                <AlertCircle className="h-4 w-4" /> {errorMsg}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} required placeholder="Aman Mahadik" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">License Number</label>
                <div className="flex gap-2 items-center">
                  <Input value={licenseNum} onChange={e => setLicenseNum(e.target.value)} required placeholder="MH042023000" />
                </div>
              </div>
              <div className="space-y-2 flex items-end">
                {isOCRValidated && <Badge className="bg-emerald-500 hover:bg-emerald-600 h-10 w-full justify-center flex gap-2"><CheckCircle2 className="h-4 w-4"/> DB Verified</Badge>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">License Category</label>
                <Input value={licenseType} onChange={e => setLicenseType(e.target.value)} required placeholder="HMV, LMV" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Expiry Date</label>
                <Input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Contact Number</label>
              <Input type="tel" value={contact} onChange={e => setContact(e.target.value)} required placeholder="+91 9876543210" />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit">Save Driver</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
