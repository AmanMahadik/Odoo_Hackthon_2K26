export interface Vehicle {
  id: string;
  registration_number: string;
  model: string;
  type: 'Van' | 'Truck' | 'Bike' | 'Car' | 'Bus';
  max_load_capacity: number;
  odometer: number;
  acquisition_cost: number;
  status: 'Available' | 'On Trip' | 'In Shop' | 'Retired';
}

export interface Driver {
  id: string;
  name: string;
  license_number: string;
  license_category: string;
  license_expiry_date: string;
  contact_number: string;
  safety_score: number;
  status: 'Available' | 'On Trip' | 'Off Duty' | 'Suspended';
  user_id?: string;
  user?: any;
}

export interface Trip {
  id: string;
  trip_number: number;
  source: string;
  destination: string;
  vehicle_id: string;
  driver_id: string;
  cargo_weight: number;
  planned_distance: number;
  actual_distance?: number;
  status: 'Draft' | 'Dispatched' | 'Completed' | 'Cancelled';
  created_at: string;
  // Joins
  vehicle?: Vehicle;
  driver?: Driver;
}

export interface MaintenanceLog {
  id: string;
  vehicle_id: string;
  description: string;
  cost: number;
  status: 'Open' | 'Closed';
  opened_at: string;
  closed_at?: string;
  vehicle?: Vehicle;
}

export interface FuelLog {
  id: string;
  vehicle_id: string;
  trip_id?: string;
  liters: number;
  cost: number;
  log_date: string;
  vehicle?: Vehicle;
}

export interface Expense {
  id: string;
  vehicle_id: string;
  trip_id?: string;
  type: 'toll' | 'repair' | 'misc';
  amount: number;
  expense_date: string;
  description?: string;
  vehicle?: Vehicle;
}

export const mockVehicles: Vehicle[] = [];
export const mockDrivers: Driver[] = [];
export const mockTrips: Trip[] = [];
export const mockMaintenanceLogs: MaintenanceLog[] = [];
export const mockFuelLogs: FuelLog[] = [];
export const mockExpenses: Expense[] = [];
