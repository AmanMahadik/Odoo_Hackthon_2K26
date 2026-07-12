import { supabase } from './supabase';
import { 
  Vehicle, Driver, Trip, MaintenanceLog, FuelLog, Expense,
  mockVehicles, mockDrivers, mockTrips, mockMaintenanceLogs, mockFuelLogs, mockExpenses 
} from './mockData';

// Safe helper to load sandbox state from localStorage or initialize
const getSandboxState = <T>(key: string, defaultState: T[]): T[] => {
  if (typeof window === 'undefined') return defaultState;
  const stored = localStorage.getItem(`transitops_sandbox_${key}`);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return defaultState;
    }
  }
  localStorage.setItem(`transitops_sandbox_${key}`, JSON.stringify(defaultState));
  return defaultState;
};

const saveSandboxState = <T>(key: string, data: T[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`transitops_sandbox_${key}`, JSON.stringify(data));
  }
};

// Global mode check - will be set to false if a connection error happens
let isLiveMode = true;

// Helper to determine if a Supabase query is successful or we should fallback
async function executeQuery<T>(queryPromise: any, sandboxKey: string, fallbackData: T[]): Promise<{ data: T[]; isSandbox: boolean }> {
  if (!isLiveMode) {
    return { data: getSandboxState<T>(sandboxKey, fallbackData), isSandbox: true };
  }

  try {
    const { data, error } = await queryPromise;
    if (error || !data || data.length === 0) {
      // If table is missing or empty, fall back
      if (error && (error.code === 'PGRST205' || error.message?.includes('schema cache'))) {
        console.warn(`Supabase table ${sandboxKey} not found. Falling back to Sandbox mode.`);
        isLiveMode = false;
      }
      return { data: getSandboxState<T>(sandboxKey, fallbackData), isSandbox: true };
    }
    return { data: data as unknown as T[], isSandbox: false };
  } catch (err) {
    console.error("Supabase connection error. Switched to Sandbox mode.", err);
    isLiveMode = false;
    return { data: getSandboxState<T>(sandboxKey, fallbackData), isSandbox: true };
  }
}

export const db = {
  // Check active mode
  getMode: () => isLiveMode ? 'Live Database' : 'Sandbox (Offline/Unseeded DB)',

  // VEHICLES
  async getVehicles(): Promise<Vehicle[]> {
    const { data } = await executeQuery<any>(
      supabase.from('vehicles').select('*').order('registration_number'),
      'vehicles',
      mockVehicles
    );
    return data;
  },

  async createVehicle(v: Omit<Vehicle, 'id'>): Promise<Vehicle> {
    if (isLiveMode) {
      try {
        const { data, error } = await supabase.from('vehicles').insert([v]).select().single();
        if (!error && data) return data;
        console.error("Create vehicle in Supabase error, creating locally:", error);
      } catch (err) {
        console.error("Create vehicle error:", err);
      }
    }
    // Sandbox
    const vehicles = getSandboxState<Vehicle>('vehicles', mockVehicles);
    const newVehicle: Vehicle = { ...v, id: `v_${Date.now()}` };
    vehicles.push(newVehicle);
    saveSandboxState('vehicles', vehicles);
    return newVehicle;
  },

  async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle> {
    if (isLiveMode && !id.startsWith('v_')) {
      try {
        const { data, error } = await supabase.from('vehicles').update(updates).eq('id', id).select().single();
        if (!error && data) return data;
      } catch (err) {
        console.error(err);
      }
    }
    // Sandbox
    const vehicles = getSandboxState<Vehicle>('vehicles', mockVehicles);
    const index = vehicles.findIndex(item => item.id === id);
    if (index !== -1) {
      vehicles[index] = { ...vehicles[index], ...updates };
      saveSandboxState('vehicles', vehicles);
      return vehicles[index];
    }
    throw new Error('Vehicle not found');
  },

  // DRIVERS
  async getDrivers(): Promise<Driver[]> {
    const { data } = await executeQuery<any>(
      supabase.from('drivers').select('*').order('name'),
      'drivers',
      mockDrivers
    );
    return data;
  },

  async createDriver(d: Omit<Driver, 'id'>): Promise<Driver> {
    if (isLiveMode) {
      try {
        const { data, error } = await supabase.from('drivers').insert([d]).select().single();
        if (!error && data) return data;
      } catch (err) {
        console.error(err);
      }
    }
    const drivers = getSandboxState<Driver>('drivers', mockDrivers);
    const newDriver: Driver = { ...d, id: `d_${Date.now()}` };
    drivers.push(newDriver);
    saveSandboxState('drivers', drivers);
    return newDriver;
  },

  async updateDriver(id: string, updates: Partial<Driver>): Promise<Driver> {
    if (isLiveMode && !id.startsWith('d_')) {
      try {
        const { data, error } = await supabase.from('drivers').update(updates).eq('id', id).select().single();
        if (!error && data) return data;
      } catch (err) {
        console.error(err);
      }
    }
    const drivers = getSandboxState<Driver>('drivers', mockDrivers);
    const index = drivers.findIndex(item => item.id === id);
    if (index !== -1) {
      drivers[index] = { ...drivers[index], ...updates };
      saveSandboxState('drivers', drivers);
      return drivers[index];
    }
    throw new Error('Driver not found');
  },

  // TRIPS
  async getTrips(): Promise<Trip[]> {
    if (isLiveMode) {
      try {
        // Query trips and resolve relations
        const { data, error } = await supabase.from('trips').select(`
          *,
          vehicle:vehicles(*),
          driver:drivers(*)
        `).order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data as unknown as Trip[];
        }
      } catch (err) {
        console.error(err);
      }
    }
    // Sandbox
    const trips = getSandboxState<Trip>('trips', mockTrips);
    const vehicles = getSandboxState<Vehicle>('vehicles', mockVehicles);
    const drivers = getSandboxState<Driver>('drivers', mockDrivers);

    return trips.map(t => ({
      ...t,
      vehicle: vehicles.find(v => v.id === t.vehicle_id),
      driver: drivers.find(d => d.id === t.driver_id)
    })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async createTrip(t: Omit<Trip, 'id' | 'trip_number' | 'created_at'>): Promise<Trip> {
    // Database rules validation (cargo weight, availability checks)
    const vehicles = await this.getVehicles();
    const drivers = await this.getDrivers();
    
    const vehicle = vehicles.find(v => v.id === t.vehicle_id);
    const driver = drivers.find(d => d.id === t.driver_id);

    if (!vehicle) throw new Error('Selected vehicle not found');
    if (!driver) throw new Error('Selected driver not found');

    if (t.status === 'Dispatched') {
      if (vehicle.status !== 'Available') throw new Error(`Vehicle is ${vehicle.status}, not Available`);
      if (driver.status !== 'Available') throw new Error(`Driver is ${driver.status}, not Available`);
      if (new Date(driver.license_expiry_date) < new Date()) throw new Error('Driver license has expired');
      if (t.cargo_weight > vehicle.max_load_capacity) {
        throw new Error(`Cargo weight (${t.cargo_weight}kg) exceeds vehicle maximum capacity (${vehicle.max_load_capacity}kg)`);
      }
    }

    if (isLiveMode) {
      try {
        const { data, error } = await supabase.from('trips').insert([t]).select().single();
        if (!error && data) {
          // Trigger updates status dynamically if handled via Postgres triggers, or client falls back
          return data;
        }
        console.error("Create trip DB error, using sandbox:", error);
      } catch (err) {
        console.error(err);
      }
    }

    // Sandbox
    const trips = getSandboxState<Trip>('trips', mockTrips);
    const newTrip: Trip = {
      ...t,
      id: `t_${Date.now()}`,
      trip_number: trips.length > 0 ? Math.max(...trips.map(x => x.trip_number)) + 1 : 1001,
      created_at: new Date().toISOString()
    };
    trips.push(newTrip);
    saveSandboxState('trips', trips);

    // Auto update status if dispatched in Sandbox mode
    if (t.status === 'Dispatched') {
      await this.updateVehicle(t.vehicle_id, { status: 'On Trip' });
      await this.updateDriver(t.driver_id, { status: 'On Trip' });
    }

    return newTrip;
  },

  async updateTrip(id: string, updates: Partial<Trip>): Promise<Trip> {
    const trips = getSandboxState<Trip>('trips', mockTrips);
    const currentTrip = trips.find(x => x.id === id);

    if (isLiveMode && !id.startsWith('t_')) {
      try {
        const { data, error } = await supabase.from('trips').update(updates).eq('id', id).select().single();
        if (!error && data) return data;
      } catch (err) {
        console.error(err);
      }
    }

    // Sandbox State transitions
    if (currentTrip) {
      // Dispatch -> On Trip
      if (updates.status === 'Dispatched' && currentTrip.status !== 'Dispatched') {
        await this.updateVehicle(currentTrip.vehicle_id, { status: 'On Trip' });
        await this.updateDriver(currentTrip.driver_id, { status: 'On Trip' });
      }
      // Complete -> Available
      else if (updates.status === 'Completed' && currentTrip.status === 'Dispatched') {
        await this.updateVehicle(currentTrip.vehicle_id, { status: 'Available' });
        await this.updateDriver(currentTrip.driver_id, { status: 'Available' });
        
        // Auto create fuel log if complete metrics provided
        if (updates.actual_distance) {
          const liters = Math.round(updates.actual_distance * 0.15); // mock 15L/100km
          await this.createFuelLog({
            vehicle_id: currentTrip.vehicle_id,
            trip_id: id,
            liters,
            cost: liters * 2.1, // mock cost
            log_date: new Date().toISOString().split('T')[0]
          });
        }
      }
      // Cancel -> Available
      else if (updates.status === 'Cancelled' && currentTrip.status === 'Dispatched') {
        await this.updateVehicle(currentTrip.vehicle_id, { status: 'Available' });
        await this.updateDriver(currentTrip.driver_id, { status: 'Available' });
      }

      const index = trips.findIndex(item => item.id === id);
      trips[index] = { ...trips[index], ...updates };
      saveSandboxState('trips', trips);
      return trips[index];
    }
    throw new Error('Trip not found');
  },

  // MAINTENANCE
  async getMaintenanceLogs(): Promise<MaintenanceLog[]> {
    if (isLiveMode) {
      try {
        const { data, error } = await supabase.from('maintenance_logs').select('*, vehicle:vehicles(*)').order('opened_at', { ascending: false });
        if (!error && data && data.length > 0) return data as unknown as MaintenanceLog[];
      } catch (err) {
        console.error(err);
      }
    }
    const logs = getSandboxState<MaintenanceLog>('maintenance_logs', mockMaintenanceLogs);
    const vehicles = getSandboxState<Vehicle>('vehicles', mockVehicles);
    return logs.map(l => ({
      ...l,
      vehicle: vehicles.find(v => v.id === l.vehicle_id)
    })).sort((a, b) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime());
  },

  async createMaintenanceLog(l: Omit<MaintenanceLog, 'id' | 'opened_at'>): Promise<MaintenanceLog> {
    if (isLiveMode) {
      try {
        const { data, error } = await supabase.from('maintenance_logs').insert([l]).select().single();
        if (!error && data) return data;
      } catch (err) {
        console.error(err);
      }
    }
    const logs = getSandboxState<MaintenanceLog>('maintenance_logs', mockMaintenanceLogs);
    const newLog: MaintenanceLog = {
      ...l,
      id: `m_${Date.now()}`,
      opened_at: new Date().toISOString()
    };
    logs.push(newLog);
    saveSandboxState('maintenance_logs', logs);

    // Auto set vehicle to In Shop in Sandbox mode
    if (l.status === 'Open') {
      await this.updateVehicle(l.vehicle_id, { status: 'In Shop' });
    }
    return newLog;
  },

  async updateMaintenanceLog(id: string, updates: Partial<MaintenanceLog>): Promise<MaintenanceLog> {
    const logs = getSandboxState<MaintenanceLog>('maintenance_logs', mockMaintenanceLogs);
    const currentLog = logs.find(x => x.id === id);

    if (isLiveMode && !id.startsWith('m_')) {
      try {
        const { data, error } = await supabase.from('maintenance_logs').update(updates).eq('id', id).select().single();
        if (!error && data) return data;
      } catch (err) {
        console.error(err);
      }
    }

    if (currentLog) {
      // Closed -> Restore vehicle
      if (updates.status === 'Closed' && currentLog.status === 'Open') {
        const vehicles = getSandboxState<Vehicle>('vehicles', mockVehicles);
        const vehicle = vehicles.find(v => v.id === currentLog.vehicle_id);
        if (vehicle && vehicle.status === 'In Shop') {
          await this.updateVehicle(currentLog.vehicle_id, { status: 'Available' });
        }

        // Add to expenses
        if (currentLog.cost > 0) {
          await this.createExpense({
            vehicle_id: currentLog.vehicle_id,
            type: 'repair',
            amount: currentLog.cost,
            expense_date: new Date().toISOString().split('T')[0],
            description: `Maintenance repair cost for log: ${currentLog.description}`
          });
        }
      }

      const index = logs.findIndex(item => item.id === id);
      logs[index] = { ...logs[index], ...updates };
      saveSandboxState('maintenance_logs', logs);
      return logs[index];
    }
    throw new Error('Log not found');
  },

  // FUEL LOGS
  async getFuelLogs(): Promise<FuelLog[]> {
    if (isLiveMode) {
      try {
        const { data, error } = await supabase.from('fuel_logs').select('*, vehicle:vehicles(*)').order('log_date', { ascending: false });
        if (!error && data && data.length > 0) return data as unknown as FuelLog[];
      } catch (err) {
        console.error(err);
      }
    }
    const logs = getSandboxState<FuelLog>('fuel_logs', mockFuelLogs);
    const vehicles = getSandboxState<Vehicle>('vehicles', mockVehicles);
    return logs.map(l => ({
      ...l,
      vehicle: vehicles.find(v => v.id === l.vehicle_id)
    })).sort((a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime());
  },

  async createFuelLog(f: Omit<FuelLog, 'id'>): Promise<FuelLog> {
    if (isLiveMode) {
      try {
        const { data, error } = await supabase.from('fuel_logs').insert([f]).select().single();
        if (!error && data) return data;
      } catch (err) {
        console.error(err);
      }
    }
    const logs = getSandboxState<FuelLog>('fuel_logs', mockFuelLogs);
    const newLog: FuelLog = { ...f, id: `f_${Date.now()}` };
    logs.push(newLog);
    saveSandboxState('fuel_logs', logs);
    return newLog;
  },

  // EXPENSES
  async getExpenses(): Promise<Expense[]> {
    if (isLiveMode) {
      try {
        const { data, error } = await supabase.from('expenses').select('*, vehicle:vehicles(*)').order('expense_date', { ascending: false });
        if (!error && data && data.length > 0) return data as unknown as Expense[];
      } catch (err) {
        console.error(err);
      }
    }
    const expensesList = getSandboxState<Expense>('expenses', mockExpenses);
    const vehicles = getSandboxState<Vehicle>('vehicles', mockVehicles);
    return expensesList.map(e => ({
      ...e,
      vehicle: vehicles.find(v => v.id === e.vehicle_id)
    })).sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());
  },

  async createExpense(e: Omit<Expense, 'id'>): Promise<Expense> {
    if (isLiveMode) {
      try {
        const { data, error } = await supabase.from('expenses').insert([e]).select().single();
        if (!error && data) return data;
      } catch (err) {
        console.error(err);
      }
    }
    const expensesList = getSandboxState<Expense>('expenses', mockExpenses);
    const newExpense: Expense = { ...e, id: `e_${Date.now()}` };
    expensesList.push(newExpense);
    saveSandboxState('expenses', expensesList);
    return newExpense;
  }
};
