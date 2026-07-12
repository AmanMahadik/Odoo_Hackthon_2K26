'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { useRole } from '@/lib/roleContext';
import { Vehicle, FuelLog, Expense } from '@/lib/mockData';
import {
  Plus,
  DollarSign,
  Fuel,
  Receipt,
  AlertTriangle,
  Search,
  TrendingUp,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';

export default function FuelExpensesPage() {
  const { canAccess } = useRole();
  const canCreate = canAccess('expenses', 'create') || canAccess('fuel', 'create');

  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [fuelOpen, setFuelOpen] = useState(false);
  const [fuelVehicleId, setFuelVehicleId] = useState('');
  const [fuelLiters, setFuelLiters] = useState('');
  const [fuelCost, setFuelCost] = useState('');
  const [fuelDate, setFuelDate] = useState('');
  const [fuelError, setFuelError] = useState('');

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseVehicleId, setExpenseVehicleId] = useState('');
  const [expenseType, setExpenseType] = useState<'toll' | 'repair' | 'misc'>('toll');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseError, setExpenseError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fLogs, expList, vList] = await Promise.all([
        db.getFuelLogs(),
        db.getExpenses(),
        db.getVehicles(),
      ]);
      setFuelLogs(fLogs);
      setExpenses(expList);
      setVehicles(vList.filter((v) => v.status !== 'Retired'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setFuelDate(new Date().toISOString().split('T')[0]);
    setExpenseDate(new Date().toISOString().split('T')[0]);
  }, []);

  const handleCreateFuelLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setFuelError('');
    if (!fuelVehicleId || !fuelLiters || !fuelCost || !fuelDate) {
      setFuelError('Please complete all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      await db.createFuelLog({
        vehicle_id: fuelVehicleId,
        liters: Number(fuelLiters),
        cost: Number(fuelCost),
        log_date: fuelDate,
      });
      setFuelVehicleId('');
      setFuelLiters('');
      setFuelCost('');
      setFuelOpen(false);
      fetchData();
    } catch (err: any) {
      setFuelError(err.message || 'Error saving fuel log.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseError('');
    if (!expenseVehicleId || !expenseAmount || !expenseDate || !expenseDesc) {
      setExpenseError('Please complete all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      await db.createExpense({
        vehicle_id: expenseVehicleId,
        type: expenseType,
        amount: Number(expenseAmount),
        expense_date: expenseDate,
        description: expenseDesc.trim(),
      });
      setExpenseVehicleId('');
      setExpenseAmount('');
      setExpenseDesc('');
      setExpenseOpen(false);
      fetchData();
    } catch (err: any) {
      setExpenseError(err.message || 'Error saving expense log.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFuelLog = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this fuel log?')) return;
    try {
      await db.deleteFuelLog(id);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this expense?')) return;
    try {
      await db.deleteExpense(id);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

    const totalFuelCost = fuelLogs.reduce((sum, log) => sum + log.cost, 0);
  const totalFuelLiters = fuelLogs.reduce((sum, log) => sum + log.liters, 0);
  const totalExpenseCost = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const avgFuelRate = totalFuelLiters > 0 ? totalFuelCost / totalFuelLiters : 0;
  const grandTotal = totalFuelCost + totalExpenseCost;

  const q = search.toLowerCase();
  const filteredFuel = fuelLogs.filter((log) => {
    if (!q) return true;
    return (
      log.vehicle?.registration_number?.toLowerCase().includes(q) ||
      log.log_date.includes(q)
    );
  });
  const filteredExpenses = expenses.filter((exp) => {
    if (!q) return true;
    return (
      exp.vehicle?.registration_number?.toLowerCase().includes(q) ||
      exp.type.includes(q) ||
      exp.description?.toLowerCase().includes(q) ||
      exp.expense_date.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Fuel & Expenses</h2>
          <p className="text-sm text-muted-foreground">
            Track consumption, tolls, repairs, and operating cost per vehicle
          </p>
        </div>
        {canCreate && (
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" onClick={() => setFuelOpen(true)} className="gap-1.5">
              <Fuel className="h-4 w-4" /> Log fuel
            </Button>
            <Button onClick={() => setExpenseOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Log expense
            </Button>
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Fuel spend</CardTitle>
            <Fuel className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalFuelCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-muted-foreground">{fuelLogs.length} fill-ups logged</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Other expenses</CardTitle>
            <Receipt className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalExpenseCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-muted-foreground">Tolls, repairs, misc</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Avg $/L</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgFuelRate.toFixed(2)}</div>
            <p className="text-[10px] text-muted-foreground">{totalFuelLiters.toFixed(0)} L total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Combined cost</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-muted-foreground">Fuel + general expenses</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + tabs */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search vehicle, type, date…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="fuel" className="w-full">
        <TabsList>
          <TabsTrigger value="fuel">Fuel logs ({filteredFuel.length})</TabsTrigger>
          <TabsTrigger value="expenses">Expenses ({filteredExpenses.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="fuel" className="mt-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
            </div>
          ) : filteredFuel.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Fuel className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium">No fuel logs found</p>
                {canCreate && (
                  <Button className="mt-4" size="sm" onClick={() => setFuelOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Log fuel
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
                      <TableHead>Date</TableHead>
                      <TableHead>Liters</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Source</TableHead>
                      {canAccess('expenses', 'create') && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFuel.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-semibold">
                          {log.vehicle?.registration_number || 'Unknown'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{log.log_date}</TableCell>
                        <TableCell className="font-mono">{log.liters} L</TableCell>
                        <TableCell className="font-mono font-medium">${log.cost.toFixed(2)}</TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          ${(log.cost / Math.max(log.liters, 0.01)).toFixed(2)}/L
                        </TableCell>
                        <TableCell>
                          {log.trip_id ? (
                            <Badge variant="secondary" className="text-[10px]">
                              Trip linked
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">Manual</span>
                          )}
                        </TableCell>
                        {canAccess('expenses', 'create') && (
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteFuelLog(log.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="expenses" className="mt-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
            </div>
          ) : filteredExpenses.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Receipt className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium">No expenses recorded</p>
                {canCreate && (
                  <Button className="mt-4" size="sm" onClick={() => setExpenseOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Log expense
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
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      {canAccess('expenses', 'create') && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((exp) => (
                      <TableRow key={exp.id}>
                        <TableCell className="font-semibold">
                          {exp.vehicle?.registration_number || 'Unknown'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{exp.expense_date}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              exp.type === 'toll'
                                ? 'border-blue-500/30 text-blue-600 dark:text-blue-400'
                                : exp.type === 'repair'
                                  ? 'border-red-500/30 text-red-600 dark:text-red-400'
                                  : ''
                            }
                          >
                            {exp.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate">
                          {exp.description || 'General fee'}
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          ${exp.amount.toFixed(2)}
                        </TableCell>
                        {canAccess('expenses', 'create') && (
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteExpense(exp.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Fuel dialog */}
      <Dialog open={fuelOpen} onOpenChange={setFuelOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Log fuel entry</DialogTitle>
            <DialogDescription>Record a fill-up against a fleet vehicle</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateFuelLog} className="space-y-4">
            {fuelError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {fuelError}
              </div>
            )}
            <div className="space-y-2">
              <Label>Vehicle</Label>
              <Select value={fuelVehicleId} onValueChange={(v) => v && setFuelVehicleId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.registration_number} — {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Liters</Label>
                <Input
                  type="number"
                  required
                  min={0}
                  step="0.1"
                  placeholder="50"
                  value={fuelLiters}
                  onChange={(e) => setFuelLiters(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Cost ($)</Label>
                <Input
                  type="number"
                  required
                  min={0}
                  step="0.01"
                  placeholder="110"
                  value={fuelCost}
                  onChange={(e) => setFuelCost(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Purchase date</Label>
              <Input
                type="date"
                required
                value={fuelDate}
                onChange={(e) => setFuelDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setFuelOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save entry'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Expense dialog */}
      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Log fleet expense</DialogTitle>
            <DialogDescription>Toll, repair, or miscellaneous operating cost</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateExpense} className="space-y-4">
            {expenseError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {expenseError}
              </div>
            )}
            <div className="space-y-2">
              <Label>Vehicle</Label>
              <Select value={expenseVehicleId} onValueChange={(v) => v && setExpenseVehicleId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.registration_number} — {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={expenseType}
                  onValueChange={(v) => setExpenseType(v as 'toll' | 'repair' | 'misc')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="toll">Toll</SelectItem>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="misc">Miscellaneous</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount ($)</Label>
                <Input
                  type="number"
                  required
                  min={0}
                  step="0.01"
                  placeholder="15.50"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                type="text"
                required
                placeholder="Toll bridge fee or parking"
                value={expenseDesc}
                onChange={(e) => setExpenseDesc(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Charge date</Label>
              <Input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setExpenseOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save expense'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
