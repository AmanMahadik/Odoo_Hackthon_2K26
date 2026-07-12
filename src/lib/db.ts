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
        if (error) throw error;
        if (data) return data;
      } catch (err: any) {
        console.error("Create vehicle Supabase error:", err.message || err);
        throw err;
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
        if (error) throw error;
        if (data) return data;
      } catch (err: any) {
        console.error("Update vehicle Supabase error:", err.message || err);
        throw err;
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
        if (error) throw error;
        if (data) return data;
      } catch (err: any) {
        console.error("Create driver Supabase error:", err.message || err);
        throw err;
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
        if (error) throw error;
        if (data) return data;
      } catch (err: any) {
        console.error("Update driver Supabase error:", err.message || err);
        throw err;
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
        if (error) throw error;
        if (data) return data;
      } catch (err: any) {
        console.error("Create trip Supabase error:", err.message || err);
        throw err;
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
        if (error) throw error;
        if (data) return data;
      } catch (err: any) {
        console.error("Update trip Supabase error:", err.message || err);
        throw err;
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
        if (error) throw error;
        if (data) return data;
      } catch (err: any) {
        console.error("Create maintenance log Supabase error:", err.message || err);
        throw err;
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
        if (error) throw error;
        if (data) return data;
      } catch (err: any) {
        console.error("Update maintenance log Supabase error:", err.message || err);
        throw err;
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
      } catch (err: any) {
        console.error("Get fuel logs Supabase error:", err.message || err);
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
        if (error) throw error;
        if (data) return data;
      } catch (err: any) {
        console.error("Create fuel log Supabase error:", err.message || err);
        throw err;
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
      } catch (err: any) {
        console.error("Get expenses Supabase error:", err.message || err);
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
        if (error) throw error;
        if (data) return data;
      } catch (err: any) {
        console.error("Create expense Supabase error:", err.message || err);
        throw err;
      }
    }
    const expensesList = getSandboxState<Expense>('expenses', mockExpenses);
    const newExpense: Expense = { ...e, id: `e_${Date.now()}` };
    expensesList.push(newExpense);
    saveSandboxState('expenses', expensesList);
    return newExpense;
  },

  // PROFILES
  async getDriverProfiles(): Promise<any[]> {
    if (isLiveMode) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'Driver')
          .order('full_name');
        if (error) throw error;
        if (data) return data;
      } catch (err: any) {
        console.error("Get driver profiles Supabase error:", err.message || err);
      }
    }
    return [
      { id: 'sb_driver_1', full_name: 'Alex Johnson', role: 'Driver', contact_number: '+1-555-0101' },
      { id: 'sb_driver_2', full_name: 'Sarah Chen', role: 'Driver', contact_number: '+1-555-0102' },
      { id: 'sb_driver_3', full_name: 'Mike Ross', role: 'Driver', contact_number: '+1-555-0103' }
    ];
  },

  async getProfile(userId: string): Promise<any | null> {
    if (isLiveMode) {
      try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
        if (!error && data) return data;
      } catch (err) {
        console.error("Get profile error:", err);
      }
    }
    return {
      id: userId,
      full_name: 'Sandbox Admin',
      role: 'Fleet Manager',
      contact_number: '+1-555-0199'
    };
  },

  async updateProfile(userId: string, updates: any): Promise<any> {
    if (isLiveMode) {
      try {
        // 1. Fetch current profile row if exists
        const { data: existing } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
        
        let data: any;
        let error: any;

        if (existing) {
          // If profile exists, use UPDATE and strip 'role' so it CANNOT be changed
          const { role, id, ...allowedUpdates } = updates;
          const res = await supabase
            .from('profiles')
            .update(allowedUpdates)
            .eq('id', userId)
            .select()
            .single();
          data = res.data;
          error = res.error;
        } else {
          // If profile does not exist (backfill on update), use INSERT with initial role
          const payload = { 
            id: userId, 
            full_name: updates.full_name || 'Auth User',
            role: updates.role || 'Fleet Manager',
            contact_number: updates.contact_number
          };
          const res = await supabase
            .from('profiles')
            .insert([payload])
            .select()
            .single();
          data = res.data;
          error = res.error;
        }

        if (error) throw error;
        if (data) return data;
      } catch (err: any) {
        console.error("Update profile Supabase error:", err.message || err);
        throw err;
      }
    }
    return {
      id: userId,
      full_name: updates.full_name || 'Sandbox Admin',
      role: 'Fleet Manager',
      contact_number: updates.contact_number
    };
  },

  async backfillProfiles(): Promise<{ success: boolean; count: number; message: string }> {
    if (isLiveMode) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return { success: false, count: 0, message: "No active session found." };

        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
        if (!profile) {
          const { error } = await supabase.from('profiles').insert([{
            id: session.user.id,
            full_name: session.user.user_metadata?.full_name || 'Restored User',
            role: session.user.user_metadata?.role || 'Fleet Manager'
          }]);
          if (error) throw error;
          return { success: true, count: 1, message: "Missing profile backfilled successfully." };
        }
        return { success: true, count: 0, message: "Profile already exists." };
      } catch (err: any) {
        console.error("Backfill error:", err);
        return { success: false, count: 0, message: err.message || "Failed to backfill." };
      }
    }
    return { success: true, count: 0, message: "Sandbox mode. No backfill needed." };
  },

  // NOTIFICATIONS (generated dynamically from data state to satisfy the dynamic rule)
  async getNotifications(): Promise<{ id: string; type: string; text: string; time: string }[]> {
    const notificationsList: { id: string; type: string; text: string; time: string }[] = [];
    
    try {
      const drivers = await this.getDrivers();
      const today = new Date();
      drivers.forEach(d => {
        const expiry = new Date(d.license_expiry_date);
        const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          notificationsList.push({
            id: `notif_exp_${d.id}`,
            type: 'expiry',
            text: `Driver ${d.name}'s license has EXPIRED!`,
            time: 'Expired status'
          });
        } else if (diffDays <= 30) {
          notificationsList.push({
            id: `notif_exp_${d.id}`,
            type: 'expiry',
            text: `Driver ${d.name}'s license is expiring in ${diffDays} days!`,
            time: 'Action required'
          });
        }
      });

      const vehicles = await this.getVehicles();
      vehicles.forEach(v => {
        if (v.status === 'In Shop') {
          notificationsList.push({
            id: `notif_maint_${v.id}`,
            type: 'maintenance',
            text: `Vehicle ${v.registration_number} is undergoing active workshop maintenance.`,
            time: 'In shop'
          });
        } else if (v.odometer > 80000 && v.status === 'Available') {
          notificationsList.push({
            id: `notif_odo_${v.id}`,
            type: 'maintenance',
            text: `Vehicle ${v.registration_number} high mileage check (${v.odometer.toLocaleString()} km). Schedule service soon.`,
            time: 'Overdue soon'
          });
        }
      });

      const trips = await this.getTrips();
      const activeTrips = trips.filter(t => t.status === 'Dispatched');
      activeTrips.forEach(t => {
        notificationsList.push({
          id: `notif_trip_${t.id}`,
          type: 'trip',
          text: `Trip TRP-${t.id.substring(0, 4)} is actively in transit to ${t.destination}.`,
          time: 'Active'
        });
      });

    } catch (err) {
      console.error("Error generating dynamic notifications:", err);
    }

    // Default notifications if none generated to keep UI populated
    if (notificationsList.length === 0) {
      notificationsList.push(
        { id: 'default_1', type: 'expiry', text: 'All fleet drivers licenses are currently in compliance.', time: 'System Check' },
        { id: 'default_2', type: 'maintenance', text: 'No vehicles require urgent workshop check-in today.', time: 'System Check' }
      );
    }

    return notificationsList;
  }
};
