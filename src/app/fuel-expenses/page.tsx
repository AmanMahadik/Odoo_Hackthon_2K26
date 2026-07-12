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
  FileText,
  AlertTriangle,
  X
} from 'lucide-react';

export default function FuelExpensesPage() {
  const { canAccess } = useRole();
  const [activeTab, setActiveTab] = useState<'fuel' | 'expenses'>('fuel');
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Fuel Form Modal
  const [fuelOpen, setFuelOpen] = useState(false);
  const [fuelVehicleId, setFuelVehicleId] = useState('');
  const [fuelLiters, setFuelLiters] = useState('');
  const [fuelCost, setFuelCost] = useState('');
  const [fuelDate, setFuelDate] = useState('');
  const [fuelError, setFuelError] = useState('');

  // Expense Form Modal
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseVehicleId, setExpenseVehicleId] = useState('');
  const [expenseType, setExpenseType] = useState<'toll' | 'repair' | 'misc'>('toll');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseError, setExpenseError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fLogs, expList, vList] = await Promise.all([
        db.getFuelLogs(),
        db.getExpenses(),
        db.getVehicles()
      ]);
      setFuelLogs(fLogs);
      setExpenses(expList);
      setVehicles(vList.filter(v => v.status !== 'Retired'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateFuelLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setFuelError('');

    if (!fuelVehicleId || !fuelLiters || !fuelCost || !fuelDate) {
      setFuelError('Please complete all required fields.');
      return;
    }

    try {
      await db.createFuelLog({
        vehicle_id: fuelVehicleId,
        liters: Number(fuelLiters),
        cost: Number(fuelCost),
        log_date: fuelDate
      });

      setFuelVehicleId('');
      setFuelLiters('');
      setFuelCost('');
      setFuelDate('');
      setFuelOpen(false);
      fetchData();
    } catch (err: any) {
      setFuelError(err.message || 'Error saving fuel log.');
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseError('');

    if (!expenseVehicleId || !expenseAmount || !expenseDate || !expenseDesc) {
      setExpenseError('Please complete all required fields.');
      return;
    }

    try {
      await db.createExpense({
        vehicle_id: expenseVehicleId,
        type: expenseType,
        amount: Number(expenseAmount),
        expense_date: expenseDate,
        description: expenseDesc.trim()
      });

      setExpenseVehicleId('');
      setExpenseAmount('');
      setExpenseDate('');
      setExpenseDesc('');
      setExpenseOpen(false);
      fetchData();
    } catch (err: any) {
      setExpenseError(err.message || 'Error saving expense log.');
    }
  };

  // Calculate totals
  const totalFuelCost = fuelLogs.reduce((sum, log) => sum + log.cost, 0);
  const totalExpenseCost = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-foreground">Fuel & Expenses Ledger</h2>
          <p className="text-xs text-muted-foreground">Track fuel consumption, toll fees, and maintenance costs per vehicle</p>
        </div>

        <div className="flex gap-2">
          {canAccess('expenses', 'create') && (
            <>
              <button
                onClick={() => setFuelOpen(true)}
                className="px-3 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border hover:bg-secondary text-foreground rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Fuel className="h-4 w-4 text-primary" /> Log Fuel
              </button>
              <button
                onClick={() => setExpenseOpen(true)}
                className="px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm text-foreground rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-blue-500/10 cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Log Expense
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary Rollups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">Cumulative Fuel Expenses</span>
            <span className="text-2xl font-black text-foreground">${totalFuelCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <p className="text-[10px] text-muted-foreground">From {fuelLogs.length} logs recorded</p>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-xl text-primary">
            <Fuel className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">Cumulative General Expenses</span>
            <span className="text-2xl font-black text-foreground">${totalExpenseCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <p className="text-[10px] text-muted-foreground">Tolls, service charges, repairs</p>
          </div>
          <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
            <Receipt className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border flex gap-4 text-xs font-bold">
        <button
          onClick={() => setActiveTab('fuel')}
          className={`pb-3 transition-colors ${activeTab === 'fuel' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Fuel Logs ({fuelLogs.length})
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`pb-3 transition-colors ${activeTab === 'expenses' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Expenses ({expenses.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : activeTab === 'fuel' ? (
        fuelLogs.length === 0 ? (
          <div className="bg-muted/30 border border-border p-12 text-center rounded-2xl">
            <Fuel className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground font-semibold">No fuel logs found.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-muted-foreground font-bold uppercase tracking-wider">
                  <th className="p-4">Vehicle</th>
                  <th className="p-4">Log Date</th>
                  <th className="p-4">Liters Consumed</th>
                  <th className="p-4">Total Cost</th>
                  <th className="p-4">Avg Rate</th>
                  <th className="p-4">Source Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {fuelLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                    <td className="p-4 font-bold text-foreground">
                      {log.vehicle ? log.vehicle.registration_number : 'Unknown'}
                    </td>
                    <td className="p-4 text-muted-foreground">{log.log_date}</td>
                    <td className="p-4 text-foreground font-semibold font-mono">{log.liters} L</td>
                    <td className="p-4 text-foreground font-bold font-mono">${log.cost}</td>
                    <td className="p-4 text-muted-foreground font-mono">${(log.cost / log.liters).toFixed(2)}/L</td>
                    <td className="p-4">
                      {log.trip_id ? (
                        <span className="text-[10px] text-primary font-bold bg-blue-500/10 px-2 py-0.5 rounded-full">
                          Trip Link
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">Manual Log</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        expenses.length === 0 ? (
          <div className="bg-muted/30 border border-border p-12 text-center rounded-2xl">
            <Receipt className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground font-semibold">No expenses recorded.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-muted-foreground font-bold uppercase tracking-wider">
                  <th className="p-4">Vehicle</th>
                  <th className="p-4">Expense Date</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-muted/50 transition-colors">
                    <td className="p-4 font-bold text-foreground">
                      {exp.vehicle ? exp.vehicle.registration_number : 'Unknown'}
                    </td>
                    <td className="p-4 text-muted-foreground">{exp.expense_date}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] uppercase font-bold ${
                        exp.type === 'toll' ? 'bg-blue-500/10 text-primary' :
                        exp.type === 'repair' ? 'bg-destructive/10 text-destructive' :
                        'bg-secondary text-muted-foreground'
                      }`}>
                        {exp.type}
                      </span>
                    </td>
                    <td className="p-4 text-foreground">{exp.description || 'General fee charge'}</td>
                    <td className="p-4 text-foreground font-bold font-mono">${exp.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Fuel Log Modal */}
      {fuelOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm overflow-hidden shadow-xl animate-in zoom-in duration-200">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="font-extrabold text-foreground text-sm">Log Fuel Entry</h3>
              <button onClick={() => setFuelOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFuelLog} className="p-6 space-y-4">
              {fuelError && (
                <div className="p-3 bg-red-500/10 border border-destructive/20 text-destructive rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{fuelError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Vehicle</label>
                <select
                  required
                  value={fuelVehicleId}
                  onChange={(e) => setFuelVehicleId(e.target.value)}
                  className="w-full bg-background border border-border focus:border-ring border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
                >
                  <option value="">-- Select Vehicle --</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.registration_number} - {v.model}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Liters</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 50"
                    value={fuelLiters}
                    onChange={(e) => setFuelLiters(e.target.value)}
                    className="w-full bg-background border border-border focus:border-ring border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Total Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 110"
                    value={fuelCost}
                    onChange={(e) => setFuelCost(e.target.value)}
                    className="w-full bg-background border border-border focus:border-ring border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Purchase Date</label>
                <input
                  type="date"
                  required
                  value={fuelDate}
                  onChange={(e) => setFuelDate(e.target.value)}
                  className="w-full bg-background border border-border focus:border-ring border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
                />
              </div>

              <div className="pt-4 flex gap-3 border-t border-border mt-4">
                <button
                  type="button"
                  onClick={() => setFuelOpen(false)}
                  className="flex-1 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-foreground rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm text-foreground rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/10 cursor-pointer"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {expenseOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm overflow-hidden shadow-xl animate-in zoom-in duration-200">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="font-extrabold text-foreground text-sm">Log Fleet Expense</h3>
              <button onClick={() => setExpenseOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="p-6 space-y-4">
              {expenseError && (
                <div className="p-3 bg-red-500/10 border border-destructive/20 text-destructive rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{expenseError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Vehicle</label>
                <select
                  required
                  value={expenseVehicleId}
                  onChange={(e) => setExpenseVehicleId(e.target.value)}
                  className="w-full bg-background border border-border focus:border-ring border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
                >
                  <option value="">-- Select Vehicle --</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.registration_number} - {v.model}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Expense Type</label>
                  <select
                    value={expenseType}
                    onChange={(e) => setExpenseType(e.target.value as any)}
                    className="w-full bg-background border border-border focus:border-ring border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
                  >
                    <option value="toll">Toll</option>
                    <option value="repair">Repair</option>
                    <option value="misc">Miscellaneous</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 15.50"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full bg-background border border-border focus:border-ring border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Toll bridge fee or parking charge"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  className="w-full bg-background border border-border focus:border-ring border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Charge Date</label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full bg-background border border-border focus:border-ring border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
                />
              </div>

              <div className="pt-4 flex gap-3 border-t border-border mt-4">
                <button
                  type="button"
                  onClick={() => setExpenseOpen(false)}
                  className="flex-1 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-foreground rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm text-foreground rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/10 cursor-pointer"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
