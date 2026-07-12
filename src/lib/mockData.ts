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

export const mockVehicles: Vehicle[] = [
  { id: 'v1', registration_number: 'VAN-05', model: 'Ford Transit 2022', type: 'Van', max_load_capacity: 1200, odometer: 12500, acquisition_cost: 35000, status: 'Available' },
  { id: 'v2', registration_number: 'TRK-12', model: 'Isuzu NPR 2021', type: 'Truck', max_load_capacity: 5000, odometer: 45000, acquisition_cost: 65000, status: 'On Trip' },
  { id: 'v3', registration_number: 'BIK-01', model: 'Honda CB500X', type: 'Bike', max_load_capacity: 150, odometer: 8000, acquisition_cost: 8000, status: 'In Shop' },
  { id: 'v4', registration_number: 'VAN-03', model: 'Mercedes Sprinter', type: 'Van', max_load_capacity: 1500, odometer: 32000, acquisition_cost: 48000, status: 'Available' }
];

export const mockDrivers: Driver[] = [
  { id: 'd1', name: 'Alex Johnson', license_number: 'DL-2024-001', license_category: 'Heavy Vehicle', license_expiry_date: '2027-08-15', contact_number: '+1-555-0101', safety_score: 95, status: 'Available' },
  { id: 'd2', name: 'Sarah Chen', license_number: 'DL-2024-002', license_category: 'Heavy Vehicle', license_expiry_date: '2026-03-20', contact_number: '+1-555-0102', safety_score: 88, status: 'On Trip' },
  { id: 'd3', name: 'Mike Ross', license_number: 'DL-2023-003', license_category: 'Light Vehicle', license_expiry_date: '2025-01-10', contact_number: '+1-555-0103', safety_score: 72, status: 'Available' }
];

export const mockTrips: Trip[] = [
  { id: 't1', trip_number: 1001, source: 'Warehouse A', destination: 'Distribution Center B', vehicle_id: 'v1', driver_id: 'd1', cargo_weight: 800, planned_distance: 120, status: 'Completed', actual_distance: 125, created_at: '2026-07-10T10:00:00Z' },
  { id: 't2', trip_number: 1002, source: 'Port Terminal 3', destination: 'Central Depot', vehicle_id: 'v2', driver_id: 'd2', cargo_weight: 4200, planned_distance: 350, status: 'Dispatched', created_at: '2026-07-12T08:00:00Z' },
  { id: 't3', trip_number: 1003, source: 'Warehouse B', destination: 'Retail Outlet East', vehicle_id: 'v4', driver_id: 'd3', cargo_weight: 500, planned_distance: 45, status: 'Draft', created_at: '2026-07-12T09:30:00Z' }
];

export const mockMaintenanceLogs: MaintenanceLog[] = [
  { id: 'm1', vehicle_id: 'v3', description: 'Engine vibration diagnostic and replacement of drive chain', cost: 450, status: 'Open', opened_at: '2026-07-11T09:00:00Z' },
  { id: 'm2', vehicle_id: 'v1', description: 'Routine 10k mile lubrication & filter replacement', cost: 150, status: 'Closed', opened_at: '2026-07-05T08:00:00Z', closed_at: '2026-07-05T12:00:00Z' }
];

export const mockFuelLogs: FuelLog[] = [
  { id: 'f1', vehicle_id: 'v1', trip_id: 't1', liters: 45, cost: 95, log_date: '2026-07-10' },
  { id: 'f2', vehicle_id: 'v2', liters: 120, cost: 240, log_date: '2026-07-11' }
];

export const mockExpenses: Expense[] = [
  { id: 'e1', vehicle_id: 'v1', trip_id: 't1', type: 'toll', amount: 24.50, expense_date: '2026-07-10', description: 'Toll plaza bridge fee' },
  { id: 'e2', vehicle_id: 'v2', trip_id: 't2', type: 'toll', amount: 48.00, expense_date: '2026-07-12', description: 'Expressway toll charge' },
  { id: 'e3', vehicle_id: 'v3', type: 'repair', amount: 350.00, expense_date: '2026-07-11', description: 'Emergency roadside tire fix' }
];
