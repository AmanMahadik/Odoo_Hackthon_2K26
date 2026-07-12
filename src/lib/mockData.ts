// ============================================
// CORE ENTITY INTERFACES
// ============================================

export interface Vehicle {
  id: string;
  registration_number: string;
  model: string;
  type: 'Van' | 'Truck' | 'Bike' | 'Car' | 'Bus';
  max_load_capacity: number;
  odometer: number;
  acquisition_cost: number;
  status: 'Available' | 'On Trip' | 'In Shop' | 'Retired';
  fuel_type?: string;
  year?: number;
  color?: string;
  insurance_expiry?: string;
  fitness_expiry?: string;
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
  violations?: number;
  photo_url?: string;
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

// ============================================
// NEW INTERFACES FOR ADVANCED FEATURES
// ============================================

export interface GPSPosition {
  id: string;
  vehicle_id: string;
  trip_id?: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  accuracy: number;
  recorded_at: string;
}

export interface OCRScan {
  id: string;
  scan_type: 'license_plate' | 'driver_license' | 'document';
  image_path: string;
  extracted_text: string;
  extracted_data: Record<string, unknown>;
  confidence_score: number;
  validation_status: 'pending' | 'verified' | 'failed' | 'manual_review';
  registry_response?: Record<string, unknown>;
  scanned_at: string;
}

export interface AIPrediction {
  id: string;
  vehicle_id: string;
  prediction_type: 'maintenance' | 'breakdown' | 'fuel_efficiency' | 'optimal_service_window';
  component: string;
  current_health: number;
  predicted_failure_date: string;
  predicted_failure_km: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  recommended_action: string;
  economic_insight?: string;
  estimated_cost_current: number;
  estimated_cost_delayed: number;
  confidence_score: number;
  generated_at: string;
  acted_upon: boolean;
}

export interface EconomicData {
  id: string;
  data_type: 'fuel_price' | 'labor_index' | 'parts_cost' | 'inflation';
  region: string;
  value: number;
  currency: string;
  unit: string;
  source: string;
  recorded_at: string;
  valid_until: string;
}

export interface WeatherLog {
  id: string;
  region: string;
  date: string;
  condition: string;
  temperature: number;
  precipitation: number;
  humidity: number;
}

export interface DriverTelemetry {
  id: string;
  driver_id: string;
  trip_id?: string;
  harsh_braking_events: number;
  harsh_acceleration_events: number;
  speeding_events: number;
  idle_time_minutes: number;
  night_driving_hours: number;
  recorded_at: string;
}

export interface RegistryValidation {
  valid: boolean;
  plateNumber?: string;
  registrationDate?: string;
  vehicleClass?: string;
  fuelType?: string;
  manufacturer?: string;
  model?: string;
  year?: number;
  color?: string;
  ownerName?: string;
  insuranceExpiry?: string;
  fitnessExpiry?: string;
  taxStatus?: string;
  blacklisted?: boolean;
  source?: string;
}

export interface LicenseValidation {
  valid: boolean;
  licenseNumber?: string;
  holderName?: string;
  issueDate?: string;
  expiryDate?: string;
  categories?: string[];
  status?: string;
  violations?: number;
  source?: string;
}

export interface FuelPriceData {
  price: number;
  currency: string;
  trend: 'rising' | 'falling' | 'stable';
  changePercent: number;
}

export interface FuelForecast {
  date: string;
  price: number;
}

export interface MaintenancePrediction {
  component: string;
  health: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  predictedFailureDate: string;
  predictedFailureKm: number;
  recommendedAction: string;
  riskAssessment?: string;
  estimatedCost: { current: number; delayed: number; savings: number };
  optimalServiceWindow?: { start: string; end: string; reason: string };
  economicInsight?: string;
}

export interface VehicleHealthReport {
  vehicleId: string;
  vehicleReg: string;
  healthScore: number;
  predictions: MaintenancePrediction[];
  fleetOptimization?: {
    recommendedTripReduction: number;
    alternativeVehicle: string;
    reason: string;
  };
}

// ============================================
// EXPANDED MOCK DATA — 12 Vehicles
// ============================================

export const mockVehicles: Vehicle[] = [
  { id: 'v1', registration_number: 'VAN-05', model: 'Ford Transit 2022', type: 'Van', max_load_capacity: 1200, odometer: 12500, acquisition_cost: 35000, status: 'Available', fuel_type: 'Diesel', year: 2022, color: 'White', insurance_expiry: '2027-03-14', fitness_expiry: '2027-09-15' },
  { id: 'v2', registration_number: 'TRK-12', model: 'Isuzu NPR 2021', type: 'Truck', max_load_capacity: 5000, odometer: 45000, acquisition_cost: 65000, status: 'On Trip', fuel_type: 'Diesel', year: 2021, color: 'Blue', insurance_expiry: '2027-06-20', fitness_expiry: '2027-11-30' },
  { id: 'v3', registration_number: 'BIK-01', model: 'Honda CB500X', type: 'Bike', max_load_capacity: 150, odometer: 8000, acquisition_cost: 8000, status: 'In Shop', fuel_type: 'Petrol', year: 2023, color: 'Red', insurance_expiry: '2027-01-10', fitness_expiry: '2027-05-15' },
  { id: 'v4', registration_number: 'VAN-03', model: 'Mercedes Sprinter', type: 'Van', max_load_capacity: 1500, odometer: 32000, acquisition_cost: 48000, status: 'Available', fuel_type: 'Diesel', year: 2023, color: 'Silver', insurance_expiry: '2028-02-18', fitness_expiry: '2028-08-25' },
  { id: 'v5', registration_number: 'TRK-07', model: 'Volvo FH16', type: 'Truck', max_load_capacity: 8000, odometer: 78000, acquisition_cost: 95000, status: 'On Trip', fuel_type: 'Diesel', year: 2020, color: 'White', insurance_expiry: '2027-04-10', fitness_expiry: '2027-10-01' },
  { id: 'v6', registration_number: 'CAR-02', model: 'Toyota Camry 2024', type: 'Car', max_load_capacity: 300, odometer: 5200, acquisition_cost: 32000, status: 'Available', fuel_type: 'Hybrid', year: 2024, color: 'Black', insurance_expiry: '2028-07-22', fitness_expiry: '2028-12-30' },
  { id: 'v7', registration_number: 'BUS-01', model: 'Mercedes Citaro', type: 'Bus', max_load_capacity: 2000, odometer: 120000, acquisition_cost: 180000, status: 'On Trip', fuel_type: 'Diesel', year: 2019, color: 'Yellow', insurance_expiry: '2027-01-30', fitness_expiry: '2027-06-15' },
  { id: 'v8', registration_number: 'VAN-09', model: 'Renault Master', type: 'Van', max_load_capacity: 1400, odometer: 28000, acquisition_cost: 42000, status: 'Available', fuel_type: 'Diesel', year: 2023, color: 'White', insurance_expiry: '2028-03-05', fitness_expiry: '2028-09-20' },
  { id: 'v9', registration_number: 'TRK-15', model: 'MAN TGX 2022', type: 'Truck', max_load_capacity: 10000, odometer: 56000, acquisition_cost: 110000, status: 'Available', fuel_type: 'Diesel', year: 2022, color: 'Red', insurance_expiry: '2027-08-15', fitness_expiry: '2028-02-10' },
  { id: 'v10', registration_number: 'BIK-03', model: 'BMW R1250GS', type: 'Bike', max_load_capacity: 200, odometer: 15000, acquisition_cost: 18000, status: 'Available', fuel_type: 'Petrol', year: 2024, color: 'Blue', insurance_expiry: '2028-05-12', fitness_expiry: '2028-11-08' },
  { id: 'v11', registration_number: 'VAN-11', model: 'Fiat Ducato', type: 'Van', max_load_capacity: 1300, odometer: 41000, acquisition_cost: 38000, status: 'Retired', fuel_type: 'Diesel', year: 2019, color: 'Gray', insurance_expiry: '2025-12-01', fitness_expiry: '2025-06-30' },
  { id: 'v12', registration_number: 'CAR-05', model: 'Tesla Model 3', type: 'Car', max_load_capacity: 250, odometer: 22000, acquisition_cost: 45000, status: 'Available', fuel_type: 'Electric', year: 2024, color: 'White', insurance_expiry: '2028-09-18', fitness_expiry: '2029-03-25' },
];

// ============================================
// EXPANDED MOCK DATA — 8 Drivers
// ============================================

export const mockDrivers: Driver[] = [
  { id: 'd1', name: 'Alex Johnson', license_number: 'DL-2024-001', license_category: 'Heavy Vehicle', license_expiry_date: '2027-08-15', contact_number: '+1-555-0101', safety_score: 95, status: 'Available', violations: 0 },
  { id: 'd2', name: 'Sarah Chen', license_number: 'DL-2024-002', license_category: 'Heavy Vehicle', license_expiry_date: '2026-03-20', contact_number: '+1-555-0102', safety_score: 88, status: 'On Trip', violations: 1 },
  { id: 'd3', name: 'Mike Ross', license_number: 'DL-2023-003', license_category: 'Light Vehicle', license_expiry_date: '2025-01-10', contact_number: '+1-555-0103', safety_score: 72, status: 'Available', violations: 3 },
  { id: 'd4', name: 'Emily Davis', license_number: 'DL-2024-004', license_category: 'Heavy Vehicle', license_expiry_date: '2028-05-22', contact_number: '+1-555-0104', safety_score: 97, status: 'On Trip', violations: 0 },
  { id: 'd5', name: 'James Wilson', license_number: 'DL-2023-005', license_category: 'Heavy Vehicle', license_expiry_date: '2026-11-30', contact_number: '+1-555-0105', safety_score: 82, status: 'Available', violations: 2 },
  { id: 'd6', name: 'Maria Garcia', license_number: 'DL-2024-006', license_category: 'Light Vehicle', license_expiry_date: '2027-09-10', contact_number: '+1-555-0106', safety_score: 91, status: 'Off Duty', violations: 0 },
  { id: 'd7', name: 'John Davis', license_number: 'DL-2022-007', license_category: 'Heavy Vehicle', license_expiry_date: '2025-08-01', contact_number: '+1-555-0107', safety_score: 68, status: 'Available', violations: 4 },
  { id: 'd8', name: 'Lisa Thompson', license_number: 'DL-2024-008', license_category: 'Light Vehicle', license_expiry_date: '2028-02-14', contact_number: '+1-555-0108', safety_score: 94, status: 'Suspended', violations: 1 },
];

// ============================================
// EXPANDED MOCK DATA — 10+ Trips
// ============================================

export const mockTrips: Trip[] = [
  { id: 't1', trip_number: 1001, source: 'Warehouse A', destination: 'Distribution Center B', vehicle_id: 'v1', driver_id: 'd1', cargo_weight: 800, planned_distance: 120, status: 'Completed', actual_distance: 125, created_at: '2026-07-10T10:00:00Z' },
  { id: 't2', trip_number: 1002, source: 'Port Terminal 3', destination: 'Central Depot', vehicle_id: 'v2', driver_id: 'd2', cargo_weight: 4200, planned_distance: 350, status: 'Dispatched', created_at: '2026-07-12T08:00:00Z' },
  { id: 't3', trip_number: 1003, source: 'Warehouse B', destination: 'Retail Outlet East', vehicle_id: 'v4', driver_id: 'd3', cargo_weight: 500, planned_distance: 45, status: 'Draft', created_at: '2026-07-12T09:30:00Z' },
  { id: 't4', trip_number: 1004, source: 'Factory Floor C', destination: 'Airport Cargo Hub', vehicle_id: 'v5', driver_id: 'd4', cargo_weight: 6500, planned_distance: 280, status: 'Dispatched', created_at: '2026-07-12T06:15:00Z' },
  { id: 't5', trip_number: 1005, source: 'Central Depot', destination: 'Retail Outlet West', vehicle_id: 'v7', driver_id: 'd5', cargo_weight: 1800, planned_distance: 95, status: 'Dispatched', created_at: '2026-07-12T07:45:00Z' },
  { id: 't6', trip_number: 1006, source: 'Warehouse A', destination: 'Customer Site Delta', vehicle_id: 'v1', driver_id: 'd1', cargo_weight: 600, planned_distance: 80, status: 'Completed', actual_distance: 82, created_at: '2026-07-08T11:00:00Z' },
  { id: 't7', trip_number: 1007, source: 'Distribution Center B', destination: 'Port Terminal 3', vehicle_id: 'v4', driver_id: 'd6', cargo_weight: 900, planned_distance: 200, status: 'Completed', actual_distance: 210, created_at: '2026-07-06T09:00:00Z' },
  { id: 't8', trip_number: 1008, source: 'Retail Outlet East', destination: 'Warehouse A', vehicle_id: 'v8', driver_id: 'd5', cargo_weight: 400, planned_distance: 55, status: 'Cancelled', created_at: '2026-07-11T14:00:00Z' },
  { id: 't9', trip_number: 1009, source: 'Airport Cargo Hub', destination: 'Factory Floor C', vehicle_id: 'v9', driver_id: 'd7', cargo_weight: 7500, planned_distance: 290, status: 'Draft', created_at: '2026-07-12T10:00:00Z' },
  { id: 't10', trip_number: 1010, source: 'Central Depot', destination: 'Customer Site Echo', vehicle_id: 'v6', driver_id: 'd1', cargo_weight: 200, planned_distance: 35, status: 'Completed', actual_distance: 36, created_at: '2026-07-05T08:30:00Z' },
  { id: 't11', trip_number: 1011, source: 'Warehouse B', destination: 'Distribution Center B', vehicle_id: 'v2', driver_id: 'd2', cargo_weight: 3800, planned_distance: 150, status: 'Completed', actual_distance: 155, created_at: '2026-07-03T07:00:00Z' },
];

// ============================================
// EXPANDED MAINTENANCE, FUEL, EXPENSES
// ============================================

export const mockMaintenanceLogs: MaintenanceLog[] = [
  { id: 'm1', vehicle_id: 'v3', description: 'Engine vibration diagnostic and replacement of drive chain', cost: 450, status: 'Open', opened_at: '2026-07-11T09:00:00Z' },
  { id: 'm2', vehicle_id: 'v1', description: 'Routine 10k mile lubrication & filter replacement', cost: 150, status: 'Closed', opened_at: '2026-07-05T08:00:00Z', closed_at: '2026-07-05T12:00:00Z' },
  { id: 'm3', vehicle_id: 'v5', description: 'Brake pad replacement and rotor resurfacing', cost: 680, status: 'Closed', opened_at: '2026-06-28T10:00:00Z', closed_at: '2026-06-29T16:00:00Z' },
  { id: 'm4', vehicle_id: 'v2', description: 'Transmission fluid flush and filter change', cost: 320, status: 'Closed', opened_at: '2026-06-15T09:00:00Z', closed_at: '2026-06-15T14:00:00Z' },
  { id: 'm5', vehicle_id: 'v7', description: 'Air conditioning system recharge and leak repair', cost: 280, status: 'Closed', opened_at: '2026-06-20T08:00:00Z', closed_at: '2026-06-21T11:00:00Z' },
];

export const mockFuelLogs: FuelLog[] = [
  { id: 'f1', vehicle_id: 'v1', trip_id: 't1', liters: 45, cost: 95, log_date: '2026-07-10' },
  { id: 'f2', vehicle_id: 'v2', liters: 120, cost: 240, log_date: '2026-07-11' },
  { id: 'f3', vehicle_id: 'v5', trip_id: 't4', liters: 180, cost: 360, log_date: '2026-07-12' },
  { id: 'f4', vehicle_id: 'v4', trip_id: 't7', liters: 65, cost: 130, log_date: '2026-07-06' },
  { id: 'f5', vehicle_id: 'v7', trip_id: 't5', liters: 90, cost: 185, log_date: '2026-07-12' },
  { id: 'f6', vehicle_id: 'v1', trip_id: 't6', liters: 30, cost: 63, log_date: '2026-07-08' },
];

export const mockExpenses: Expense[] = [
  { id: 'e1', vehicle_id: 'v1', trip_id: 't1', type: 'toll', amount: 24.50, expense_date: '2026-07-10', description: 'Toll plaza bridge fee' },
  { id: 'e2', vehicle_id: 'v2', trip_id: 't2', type: 'toll', amount: 48.00, expense_date: '2026-07-12', description: 'Expressway toll charge' },
  { id: 'e3', vehicle_id: 'v3', type: 'repair', amount: 350.00, expense_date: '2026-07-11', description: 'Emergency roadside tire fix' },
  { id: 'e4', vehicle_id: 'v5', trip_id: 't4', type: 'toll', amount: 65.00, expense_date: '2026-07-12', description: 'Interstate highway toll' },
  { id: 'e5', vehicle_id: 'v7', type: 'misc', amount: 120.00, expense_date: '2026-07-09', description: 'Parking permit renewal' },
];

// ============================================
// GPS ROUTE DATA — Predefined routes for simulation
// Mumbai area coordinates for realistic demo
// ============================================

export interface GPSRoutePoint {
  lat: number;
  lng: number;
  speed: number;
  heading: number;
}

export const mockGPSRoutes: Record<string, GPSRoutePoint[]> = {
  // Route: Warehouse A → Distribution Center B (Van-05, Trip t2 area)
  'route_1': [
    { lat: 19.0760, lng: 72.8777, speed: 0, heading: 45 },
    { lat: 19.0820, lng: 72.8850, speed: 35, heading: 48 },
    { lat: 19.0895, lng: 72.8920, speed: 45, heading: 52 },
    { lat: 19.0980, lng: 72.9010, speed: 55, heading: 40 },
    { lat: 19.1050, lng: 72.9100, speed: 60, heading: 35 },
    { lat: 19.1130, lng: 72.9180, speed: 50, heading: 42 },
    { lat: 19.1200, lng: 72.9260, speed: 45, heading: 50 },
    { lat: 19.1280, lng: 72.9340, speed: 30, heading: 55 },
    { lat: 19.1350, lng: 72.9400, speed: 20, heading: 48 },
    { lat: 19.1400, lng: 72.9450, speed: 0, heading: 0 },
  ],
  // Route: Port Terminal → Central Depot (TRK-12)
  'route_2': [
    { lat: 18.9400, lng: 72.8350, speed: 0, heading: 0 },
    { lat: 18.9520, lng: 72.8420, speed: 25, heading: 30 },
    { lat: 18.9650, lng: 72.8500, speed: 40, heading: 25 },
    { lat: 18.9800, lng: 72.8580, speed: 50, heading: 20 },
    { lat: 18.9950, lng: 72.8650, speed: 55, heading: 15 },
    { lat: 19.0100, lng: 72.8700, speed: 60, heading: 10 },
    { lat: 19.0250, lng: 72.8750, speed: 55, heading: 8 },
    { lat: 19.0400, lng: 72.8780, speed: 45, heading: 5 },
    { lat: 19.0550, lng: 72.8800, speed: 30, heading: 0 },
    { lat: 19.0700, lng: 72.8810, speed: 0, heading: 0 },
  ],
  // Route: Factory → Airport (TRK-07)
  'route_3': [
    { lat: 19.1500, lng: 72.8500, speed: 0, heading: 180 },
    { lat: 19.1380, lng: 72.8550, speed: 30, heading: 175 },
    { lat: 19.1260, lng: 72.8610, speed: 45, heading: 170 },
    { lat: 19.1140, lng: 72.8680, speed: 55, heading: 165 },
    { lat: 19.1020, lng: 72.8720, speed: 60, heading: 160 },
    { lat: 19.0900, lng: 72.8760, speed: 50, heading: 155 },
    { lat: 19.0800, lng: 72.8800, speed: 40, heading: 150 },
    { lat: 19.0700, lng: 72.8850, speed: 25, heading: 145 },
  ],
};

// Vehicle → GPS positions (current state for map)
export const mockVehiclePositions: Record<string, { lat: number; lng: number; speed: number; heading: number; fuel_percent: number; cargo_kg: number; cargo_max: number; destination: string; eta_minutes: number }> = {
  'v1': { lat: 19.0760, lng: 72.8777, speed: 0, heading: 0, fuel_percent: 72, cargo_kg: 0, cargo_max: 1200, destination: 'Idle', eta_minutes: 0 },
  'v2': { lat: 18.9800, lng: 72.8580, speed: 48, heading: 20, fuel_percent: 55, cargo_kg: 4200, cargo_max: 5000, destination: 'Central Depot', eta_minutes: 45 },
  'v4': { lat: 19.0200, lng: 72.8600, speed: 0, heading: 0, fuel_percent: 80, cargo_kg: 0, cargo_max: 1500, destination: 'Idle', eta_minutes: 0 },
  'v5': { lat: 19.1140, lng: 72.8680, speed: 55, heading: 165, fuel_percent: 40, cargo_kg: 6500, cargo_max: 8000, destination: 'Airport Cargo Hub', eta_minutes: 32 },
  'v6': { lat: 19.0500, lng: 72.8900, speed: 0, heading: 0, fuel_percent: 90, cargo_kg: 0, cargo_max: 300, destination: 'Idle', eta_minutes: 0 },
  'v7': { lat: 19.0400, lng: 72.8350, speed: 35, heading: 280, fuel_percent: 62, cargo_kg: 1800, cargo_max: 2000, destination: 'Retail Outlet West', eta_minutes: 18 },
  'v8': { lat: 19.0650, lng: 72.8450, speed: 0, heading: 0, fuel_percent: 85, cargo_kg: 0, cargo_max: 1400, destination: 'Idle', eta_minutes: 0 },
  'v9': { lat: 19.0900, lng: 72.9100, speed: 0, heading: 0, fuel_percent: 95, cargo_kg: 0, cargo_max: 10000, destination: 'Idle', eta_minutes: 0 },
  'v10': { lat: 19.0300, lng: 72.8700, speed: 0, heading: 0, fuel_percent: 78, cargo_kg: 0, cargo_max: 200, destination: 'Idle', eta_minutes: 0 },
  'v12': { lat: 19.0550, lng: 72.8550, speed: 0, heading: 0, fuel_percent: 88, cargo_kg: 0, cargo_max: 250, destination: 'Idle', eta_minutes: 0 },
};

// ============================================
// FINANCIAL MOCK DATA — for dashboards
// ============================================

export const mockMonthlyFinancials = [
  { month: 'Jan', revenue: 85000, fuel: 12000, maintenance: 8500, labor: 15000, other: 3200 },
  { month: 'Feb', revenue: 92000, fuel: 13200, maintenance: 6800, labor: 15000, other: 2800 },
  { month: 'Mar', revenue: 98000, fuel: 11800, maintenance: 9200, labor: 15500, other: 3100 },
  { month: 'Apr', revenue: 105000, fuel: 14500, maintenance: 7500, labor: 15500, other: 3400 },
  { month: 'May', revenue: 112000, fuel: 15200, maintenance: 11000, labor: 16000, other: 2900 },
  { month: 'Jun', revenue: 108000, fuel: 14800, maintenance: 8800, labor: 16000, other: 3600 },
  { month: 'Jul', revenue: 118000, fuel: 15500, maintenance: 9500, labor: 16500, other: 3200 },
  { month: 'Aug', revenue: 125000, fuel: 16200, maintenance: 7200, labor: 16500, other: 3000 },
  { month: 'Sep', revenue: 115000, fuel: 14100, maintenance: 10500, labor: 16500, other: 3300 },
  { month: 'Oct', revenue: 122000, fuel: 15800, maintenance: 8200, labor: 17000, other: 2700 },
  { month: 'Nov', revenue: 130000, fuel: 16500, maintenance: 9800, labor: 17000, other: 3500 },
  { month: 'Dec', revenue: 135000, fuel: 17200, maintenance: 7800, labor: 17000, other: 3100 },
];

export const mockUtilization30Days = [
  { day: 'Jul 1', utilization: 72 },
  { day: 'Jul 2', utilization: 68 },
  { day: 'Jul 3', utilization: 75 },
  { day: 'Jul 4', utilization: 60 },
  { day: 'Jul 5', utilization: 78 },
  { day: 'Jul 6', utilization: 82 },
  { day: 'Jul 7', utilization: 70 },
  { day: 'Jul 8', utilization: 85 },
  { day: 'Jul 9', utilization: 80 },
  { day: 'Jul 10', utilization: 77 },
  { day: 'Jul 11', utilization: 88 },
  { day: 'Jul 12', utilization: 83 },
];

export const mockVehicleROI = [
  { vehicle: 'VAN-05', roi: 145, revenue: 48000, cost: 33100 },
  { vehicle: 'TRK-12', roi: 128, revenue: 85000, cost: 66400 },
  { vehicle: 'VAN-03', roi: 135, revenue: 52000, cost: 38500 },
  { vehicle: 'TRK-07', roi: 89, revenue: 72000, cost: 80900 },
  { vehicle: 'CAR-02', roi: 112, revenue: 28000, cost: 25000 },
  { vehicle: 'BUS-01', roi: 95, revenue: 95000, cost: 100000 },
  { vehicle: 'VAN-09', roi: 142, revenue: 46000, cost: 32400 },
  { vehicle: 'TRK-15', roi: 108, revenue: 68000, cost: 63000 },
  { vehicle: 'BIK-01', roi: 165, revenue: 12000, cost: 7270 },
  { vehicle: 'BIK-03', roi: 155, revenue: 15000, cost: 9680 },
  { vehicle: 'CAR-05', roi: 118, revenue: 32000, cost: 27100 },
  { vehicle: 'VAN-11', roi: 42, revenue: 8000, cost: 19050 },
];
