// ============================================
// MOCK SERVICES — OCR, Registry, GPS, AI, Economics
// All services return promises with realistic delays
// ============================================

import {
  RegistryValidation,
  LicenseValidation,
  FuelPriceData,
  FuelForecast,
  VehicleHealthReport,
  MaintenancePrediction,
  mockVehicles,
  mockDrivers,
  mockVehiclePositions,
  GPSRoutePoint,
  mockGPSRoutes,
  Trip,
  Vehicle,
  Driver,
} from './mockData';

// Utility: simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Cross-tab / in-app live refresh for sandbox mode */
export function emitOpsEvent(table: string, action?: string) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(
      new CustomEvent('transitops:ops', { detail: { table, action, at: Date.now() } })
    );
    // Also poke localStorage so other tabs wake up
    localStorage.setItem('transitops_ops_tick', JSON.stringify({ table, action, at: Date.now() }));
  } catch {
    /* ignore */
  }
}

// ============================================
// 1. OCR SERVICE
// ============================================

export const ocrService = {
  async scanPlate(_image?: File | string): Promise<{
    plateNumber: string;
    confidence: number;
    region: string;
    vehicleType: string;
  }> {
    await delay(800 + Math.random() * 600);
    // Realistic mock plates
    const plates = [
      { plateNumber: 'MH12AB1234', region: 'Maharashtra', vehicleType: 'Van' },
      { plateNumber: 'DL04CQ5678', region: 'Delhi', vehicleType: 'Truck' },
      { plateNumber: 'KA01MN9012', region: 'Karnataka', vehicleType: 'Car' },
      { plateNumber: 'TN22XY3456', region: 'Tamil Nadu', vehicleType: 'Van' },
      { plateNumber: 'GJ05PQ7890', region: 'Gujarat', vehicleType: 'Truck' },
    ];
    const picked = plates[Math.floor(Math.random() * plates.length)];
    return {
      ...picked,
      confidence: 0.88 + Math.random() * 0.1, // 0.88-0.98
    };
  },

  async scanLicense(_image?: File | string): Promise<{
    name: string;
    licenseNumber: string;
    expiryDate: string;
    category: string;
    categories: string[];
    issueDate: string;
    confidence: number;
  }> {
    await delay(1000 + Math.random() * 500);
    const drivers = [
      { name: 'Alex Johnson', licenseNumber: 'DL2024001234', category: 'Heavy Vehicle', categories: ['LMV', 'HGV'] },
      { name: 'Priya Sharma', licenseNumber: 'MH2023005678', category: 'Heavy Vehicle', categories: ['LMV', 'HGV', 'Transport'] },
      { name: 'Ravi Kumar', licenseNumber: 'KA2024009012', category: 'Light Vehicle', categories: ['LMV'] },
      { name: 'Chen Wei', licenseNumber: 'DL2024003456', category: 'Heavy Vehicle', categories: ['LMV', 'HGV'] },
    ];
    const picked = drivers[Math.floor(Math.random() * drivers.length)];
    const now = new Date();
    const issueDate = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate());
    const expiryDate = new Date(now.getFullYear() + 4, now.getMonth(), now.getDate());
    return {
      ...picked,
      issueDate: issueDate.toISOString().split('T')[0],
      expiryDate: expiryDate.toISOString().split('T')[0],
      confidence: 0.85 + Math.random() * 0.12,
    };
  },
};

// ============================================
// 2. REGISTRY SERVICE
// ============================================

export const registryService = {
  async validatePlate(plateNumber: string): Promise<RegistryValidation> {
    await delay(600 + Math.random() * 400);
    // Some plates might fail validation for demo
    if (plateNumber.includes('FAKE') || plateNumber.includes('XXX')) {
      return { valid: false, source: 'Govt Registry API' };
    }

    const manufacturers = ['Ford', 'Mercedes', 'Isuzu', 'Volvo', 'Toyota', 'Tata', 'Mahindra'];
    const models = ['Transit', 'Sprinter', 'NPR', 'FH16', 'HiAce', 'Ace', 'Bolero Pickup'];
    const colors = ['White', 'Silver', 'Blue', 'Red', 'Black', 'Gray'];

    const idx = Math.abs(plateNumber.split('').reduce((a, c) => a + c.charCodeAt(0), 0));

    return {
      valid: true,
      plateNumber,
      registrationDate: '2022-03-15',
      vehicleClass: 'LMV',
      fuelType: 'Diesel',
      manufacturer: manufacturers[idx % manufacturers.length],
      model: models[idx % models.length],
      year: 2020 + (idx % 5),
      color: colors[idx % colors.length],
      ownerName: 'ABC Logistics Pvt Ltd',
      insuranceExpiry: '2027-03-14',
      fitnessExpiry: '2027-09-15',
      taxStatus: 'Paid',
      blacklisted: false,
      source: 'Govt Registry API',
    };
  },

  async validateLicense(licenseNumber: string): Promise<LicenseValidation> {
    await delay(500 + Math.random() * 400);
    if (licenseNumber.includes('EXPIRED')) {
      return { valid: false, status: 'Expired', source: 'Govt License API' };
    }
    return {
      valid: true,
      licenseNumber,
      holderName: 'Alex Johnson',
      issueDate: '2020-01-10',
      expiryDate: '2027-01-09',
      categories: ['LMV', 'HGV'],
      status: 'Active',
      violations: Math.floor(Math.random() * 3),
      source: 'Govt License API',
    };
  },
};

// ============================================
// 3. GPS SERVICE
// ============================================

// Mutable progress state for live route simulation (module-level)
const routeProgress: Record<string, number> = {
  v2: 0.35,
  v5: 0.55,
  v7: 0.4,
};

/** Static demo routes (seed fleet) */
const vehicleRouteMap: Record<string, string> = {
  v2: 'route_2',
  v5: 'route_3',
  v7: 'route_1',
};

const vehicleDriverMap: Record<string, string> = {
  v2: 'd2',
  v5: 'd4',
  v7: 'd5',
  v1: 'd1',
  v4: 'd3',
  v6: 'd6',
  v8: 'd5',
  v9: 'd7',
};

/** Dynamic routes generated for newly dispatched trips */
const dynamicRoutes: Record<string, GPSRoutePoint[]> = {};
/** tripId → vehicle tracking */
type LiveDispatch = {
  tripId: string;
  vehicleId: string;
  driverId: string;
  destination: string;
  source: string;
  routeKey: string;
  cargo_kg: number;
};
const liveDispatches: Record<string, LiveDispatch> = {};

// v2 = Pune metro coords (invalidate old Mumbai ocean positions in localStorage)
const DISPATCH_STORE = 'transitops_live_dispatches_v2';
const ROUTE_STORE = 'transitops_dynamic_routes_v2';
const PROGRESS_STORE = 'transitops_route_progress_v2';

function readSandboxVehicles(): Vehicle[] {
  if (typeof window === 'undefined') return mockVehicles;
  try {
    const raw = localStorage.getItem('transitops_sandbox_vehicles');
    return raw ? JSON.parse(raw) : mockVehicles;
  } catch {
    return mockVehicles;
  }
}

function readSandboxDrivers(): Driver[] {
  if (typeof window === 'undefined') return mockDrivers;
  try {
    const raw = localStorage.getItem('transitops_sandbox_drivers');
    return raw ? JSON.parse(raw) : mockDrivers;
  } catch {
    return mockDrivers;
  }
}

function persistDispatchState() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DISPATCH_STORE, JSON.stringify(liveDispatches));
    localStorage.setItem(ROUTE_STORE, JSON.stringify(dynamicRoutes));
    localStorage.setItem(PROGRESS_STORE, JSON.stringify(routeProgress));
  } catch {
    /* ignore */
  }
}

function hydrateDispatchState() {
  if (typeof window === 'undefined') return;
  try {
    const d = localStorage.getItem(DISPATCH_STORE);
    const r = localStorage.getItem(ROUTE_STORE);
    const p = localStorage.getItem(PROGRESS_STORE);
    if (d) Object.assign(liveDispatches, JSON.parse(d));
    if (r) Object.assign(dynamicRoutes, JSON.parse(r));
    if (p) Object.assign(routeProgress, JSON.parse(p));
    // restore maps
    for (const disp of Object.values(liveDispatches)) {
      vehicleRouteMap[disp.vehicleId] = disp.routeKey;
      vehicleDriverMap[disp.vehicleId] = disp.driverId;
    }
  } catch {
    /* ignore */
  }
}

if (typeof window !== 'undefined') {
  hydrateDispatchState();
}

/** Clamp to Pune metro bbox so markers never drift over ocean */
const PUNE = {
  latMin: 18.42,
  latMax: 18.68,
  lngMin: 73.72,
  lngMax: 74.0,
};

function clampPune(lat: number, lng: number): { lat: number; lng: number } {
  return {
    lat: Math.min(PUNE.latMax, Math.max(PUNE.latMin, lat)),
    lng: Math.min(PUNE.lngMax, Math.max(PUNE.lngMin, lng)),
  };
}

/** Inland polyline around Pune (Hinjewadi / Baner / Kharadi corridor) */
function buildRouteFromBase(
  startLat: number,
  startLng: number,
  seed = 0
): GPSRoutePoint[] {
  const points: GPSRoutePoint[] = [];
  const n = 10;
  const start = clampPune(startLat, startLng);
  // Prefer east–west / slight north — stay over city land
  const dLat = ((seed % 2 === 0 ? 1 : -1) * (0.012 + (seed % 4) * 0.002));
  const dLng = 0.018 + (seed % 5) * 0.003;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const speed = t === 0 || t === 1 ? 0 : 25 + Math.sin(t * Math.PI) * 35;
    const heading = Math.atan2(dLng, dLat) * (180 / Math.PI);
    const pos = clampPune(
      start.lat + dLat * t + Math.sin(t * 3) * 0.003,
      start.lng + dLng * t + Math.cos(t * 2) * 0.002
    );
    points.push({
      lat: pos.lat,
      lng: pos.lng,
      speed,
      heading: (heading + 360) % 360,
    });
  }
  return points;
}

const ROUTE_POOL = ['route_1', 'route_2', 'route_3'];

export const gpsService = {
  /** Register a dispatched trip so the vehicle appears en-route on the map */
  startDispatch(trip: Trip): void {
    if (!trip.vehicle_id) return;
    const vehicleId = trip.vehicle_id;
    // stop any prior trip on same vehicle
    for (const [tid, d] of Object.entries(liveDispatches)) {
      if (d.vehicleId === vehicleId && tid !== trip.id) {
        delete liveDispatches[tid];
      }
    }

    const vehicles = readSandboxVehicles();
    const vehicle = vehicles.find((v) => v.id === vehicleId) || mockVehicles.find((v) => v.id === vehicleId);
    const base = mockVehiclePositions[vehicleId] || {
      lat: 18.52 + Math.random() * 0.06,
      lng: 73.78 + Math.random() * 0.1,
      speed: 0,
      heading: 0,
      fuel_percent: 70,
      cargo_kg: trip.cargo_weight || 0,
      cargo_max: vehicle?.max_load_capacity || 1000,
      destination: trip.destination,
      eta_minutes: 40,
    };
    const start = clampPune(base.lat, base.lng);

    // Prefer a free seed route, else generate dynamic polyline
    let routeKey = ROUTE_POOL[Object.keys(liveDispatches).length % ROUTE_POOL.length];
    // Always generate unique dynamic route so new trips are visible distinctly
    routeKey = `dyn_${trip.id}`;
    dynamicRoutes[routeKey] = buildRouteFromBase(start.lat, start.lng, Date.now() % 97);

    vehicleRouteMap[vehicleId] = routeKey;
    vehicleDriverMap[vehicleId] = trip.driver_id;
    routeProgress[vehicleId] = 0.05;

    mockVehiclePositions[vehicleId] = {
      ...base,
      lat: start.lat,
      lng: start.lng,
      cargo_kg: trip.cargo_weight || base.cargo_kg,
      cargo_max: vehicle?.max_load_capacity || base.cargo_max,
      destination: trip.destination,
      eta_minutes: Math.max(15, Math.round((trip.planned_distance || 40) / 1.2)),
      speed: 35,
    };

    liveDispatches[trip.id] = {
      tripId: trip.id,
      vehicleId,
      driverId: trip.driver_id,
      destination: trip.destination,
      source: trip.source,
      routeKey,
      cargo_kg: trip.cargo_weight || 0,
    };

    persistDispatchState();
    emitOpsEvent('gps', 'dispatch_start');
  },

  /** Remove tracking when trip completes/cancels */
  stopDispatch(tripId: string): void {
    const d = liveDispatches[tripId];
    if (!d) return;
    const { vehicleId, routeKey } = d;
    delete liveDispatches[tripId];
    if (routeKey.startsWith('dyn_')) delete dynamicRoutes[routeKey];
    // only remove route if no other dispatch uses this vehicle
    const still = Object.values(liveDispatches).some((x) => x.vehicleId === vehicleId);
    if (!still) {
      // keep seed demo routes for v2/v5/v7
      if (!['v2', 'v5', 'v7'].includes(vehicleId)) {
        delete vehicleRouteMap[vehicleId];
        delete routeProgress[vehicleId];
      }
      if (mockVehiclePositions[vehicleId]) {
        mockVehiclePositions[vehicleId] = {
          ...mockVehiclePositions[vehicleId],
          speed: 0,
          destination: 'Idle',
          eta_minutes: 0,
          cargo_kg: 0,
        };
      }
    }
    persistDispatchState();
    emitOpsEvent('gps', 'dispatch_stop');
  },

  /** Sync all Dispatched trips from DB into the map layer */
  syncDispatchedTrips(trips: Trip[]): void {
    const active = trips.filter((t) => t.status === 'Dispatched');
    const activeIds = new Set(active.map((t) => t.id));

    // stop stale
    for (const tid of Object.keys(liveDispatches)) {
      if (!activeIds.has(tid)) this.stopDispatch(tid);
    }
    // start missing
    for (const t of active) {
      if (!liveDispatches[t.id]) this.startDispatch(t);
    }
  },

  getActiveDispatchCount(): number {
    return Object.keys(liveDispatches).length;
  },

  /** Get current positions of all active vehicles */
  getFleetPositions(): Record<
    string,
    {
      lat: number;
      lng: number;
      speed: number;
      heading: number;
      fuel_percent: number;
      cargo_kg: number;
      cargo_max: number;
      destination: string;
      eta_minutes: number;
    }
  > {
    return this.getLiveFleetState().positions;
  },

  /**
   * Live fleet state: animates vehicles on seed + dispatched routes.
   */
  getLiveFleetState(): {
    positions: Record<
      string,
      {
        lat: number;
        lng: number;
        speed: number;
        heading: number;
        fuel_percent: number;
        cargo_kg: number;
        cargo_max: number;
        destination: string;
        eta_minutes: number;
        progress?: number;
        routeId?: string;
        tripId?: string;
      }
    >;
    routes: Record<string, { lat: number; lng: number }[]>;
  } {
    hydrateDispatchState();
    const positions: Record<string, any> = {};
    const routes: Record<string, { lat: number; lng: number }[]> = {};

    const resolvePoints = (routeId: string): GPSRoutePoint[] | undefined => {
      if (dynamicRoutes[routeId]) return dynamicRoutes[routeId];
      return mockGPSRoutes[routeId];
    };

    // Destination overlay from live dispatches
    const destByVehicle: Record<string, { dest: string; cargo: number; tripId: string }> = {};
    for (const d of Object.values(liveDispatches)) {
      destByVehicle[d.vehicleId] = {
        dest: d.destination,
        cargo: d.cargo_kg,
        tripId: d.tripId,
      };
    }

    for (const [vehicleId, routeId] of Object.entries(vehicleRouteMap)) {
      const points = resolvePoints(routeId);
      if (!points?.length) continue;

      let progress = routeProgress[vehicleId] ?? 0.15;
      progress += 0.015 + Math.random() * 0.01;
      if (progress >= 0.98) progress = 0.05;
      routeProgress[vehicleId] = progress;

      const idx = Math.min(Math.floor(progress * (points.length - 1)), points.length - 2);
      const a = points[idx];
      const b = points[idx + 1];
      const segT = progress * (points.length - 1) - idx;
      const base = mockVehiclePositions[vehicleId];
      const live = destByVehicle[vehicleId];

      const pos = clampPune(
        a.lat + (b.lat - a.lat) * segT + (Math.random() - 0.5) * 0.0002,
        a.lng + (b.lng - a.lng) * segT + (Math.random() - 0.5) * 0.0002
      );
      positions[vehicleId] = {
        lat: pos.lat,
        lng: pos.lng,
        speed: Math.max(5, a.speed + (b.speed - a.speed) * segT + (Math.random() - 0.5) * 4),
        heading: a.heading,
        fuel_percent: base?.fuel_percent ?? 60,
        cargo_kg: live?.cargo ?? base?.cargo_kg ?? 0,
        cargo_max: base?.cargo_max ?? 1000,
        destination: live?.dest || base?.destination || 'En route',
        eta_minutes: Math.max(1, Math.round((1 - progress) * (base?.eta_minutes || 40))),
        progress,
        routeId,
        tripId: live?.tripId,
      };

      routes[vehicleId] = points.map((p) => {
        const c = clampPune(p.lat, p.lng);
        return { lat: c.lat, lng: c.lng };
      });
    }

    // Idle / shop vehicles near base (Pune only)
    const allVehicles = readSandboxVehicles();
    for (const v of allVehicles) {
      if (positions[v.id]) continue;
      if (v.status === 'Retired' || v.status === 'Pending') continue;
      const p = mockVehiclePositions[v.id] || {
        lat: 18.52 + Math.random() * 0.05,
        lng: 73.8 + Math.random() * 0.08,
        speed: 0,
        heading: 0,
        fuel_percent: 80,
        cargo_kg: 0,
        cargo_max: v.max_load_capacity,
        destination: v.status === 'In Shop' ? 'Workshop · Chakan' : 'Idle',
        eta_minutes: 0,
      };
      const c = clampPune(p.lat, p.lng);
      if (!mockVehiclePositions[v.id]) {
        mockVehiclePositions[v.id] = { ...p, lat: c.lat, lng: c.lng };
      }

      const jitter = clampPune(
        c.lat + (Math.random() - 0.5) * 0.00015,
        c.lng + (Math.random() - 0.5) * 0.00015
      );
      positions[v.id] = {
        ...p,
        lat: jitter.lat,
        lng: jitter.lng,
        speed: v.status === 'In Shop' ? 0 : p.speed,
        destination: v.status === 'In Shop' ? 'Workshop · Chakan' : p.destination || 'Idle',
        progress: 0,
      };
    }

    for (const [key, p] of Object.entries(mockVehiclePositions)) {
      if (positions[key]) continue;
      const c = clampPune(
        p.lat + (Math.random() - 0.5) * 0.00015,
        p.lng + (Math.random() - 0.5) * 0.00015
      );
      positions[key] = { ...p, lat: c.lat, lng: c.lng, progress: 0 };
    }

    persistDispatchState();
    return { positions, routes };
  },

  getRoute(routeId: string): GPSRoutePoint[] {
    return dynamicRoutes[routeId] || mockGPSRoutes[routeId] || [];
  },

  getRouteIds(): string[] {
    return [...Object.keys(mockGPSRoutes), ...Object.keys(dynamicRoutes)];
  },

  simulateMovement(
    _currentPos: { lat: number; lng: number },
    routePoints: GPSRoutePoint[],
    progress: number
  ): { lat: number; lng: number; speed: number; heading: number } {
    const idx = Math.min(Math.floor(progress * routePoints.length), routePoints.length - 1);
    const point = routePoints[idx];
    return {
      lat: point.lat + (Math.random() - 0.5) * 0.0005,
      lng: point.lng + (Math.random() - 0.5) * 0.0005,
      speed: point.speed,
      heading: point.heading,
    };
  },

  getDriverForVehicle(
    vehicleId: string
  ): { driver: Driver; vehicle: Vehicle } | null {
    const vehicles = readSandboxVehicles();
    const drivers = readSandboxDrivers();
    const vehicle =
      vehicles.find((v) => v.id === vehicleId) ||
      mockVehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return null;

    // Prefer live dispatch driver
    const live = Object.values(liveDispatches).find((d) => d.vehicleId === vehicleId);
    const driverId = live?.driverId || vehicleDriverMap[vehicleId];
    const driver =
      (driverId ? drivers.find((d) => d.id === driverId) || mockDrivers.find((d) => d.id === driverId) : undefined) ||
      drivers.find((d) => d.status === 'On Trip') ||
      drivers.find((d) => d.status === 'Available') ||
      mockDrivers[0];

    if (!driver) return null;
    return { driver, vehicle };
  },
};

// ============================================
// 4. AI PREDICTION SERVICE
// ============================================

export const aiPredictionService = {
  async predictMaintenance(vehicleId: string): Promise<VehicleHealthReport> {
    await delay(1200 + Math.random() * 800);

    const vehicle = mockVehicles.find(v => v.id === vehicleId);
    if (!vehicle) throw new Error('Vehicle not found');

    // Rule-based heuristic engine
    const predictions: MaintenancePrediction[] = [];
    const odometer = vehicle.odometer;

    // Oil Change: every 5000km
    const kmSinceOil = odometer % 5000;
    const oilHealth = 1 - (kmSinceOil / 5000);
    if (oilHealth < 0.75) {
      const failureKm = odometer + (5000 - kmSinceOil);
      const failureDate = new Date();
      failureDate.setDate(failureDate.getDate() + Math.floor((5000 - kmSinceOil) / 80));
      predictions.push({
        component: 'Engine Oil',
        health: Math.round(oilHealth * 100) / 100,
        urgency: oilHealth < 0.3 ? 'high' : 'medium',
        predictedFailureDate: failureDate.toISOString().split('T')[0],
        predictedFailureKm: failureKm,
        recommendedAction: 'Schedule oil change at nearest service center',
        estimatedCost: { current: 85, delayed: 120, savings: 35 },
        optimalServiceWindow: {
          start: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
          end: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
          reason: 'Fuel prices rising 8% next month; service now saves $45',
        },
        economicInsight: 'Parts availability is normal. Labor cost index at 1.15x baseline.',
      });
    }

    // Brake Pads: every 15000km
    const kmSinceBrake = odometer % 15000;
    const brakeHealth = 1 - (kmSinceBrake / 15000);
    if (brakeHealth < 0.6) {
      const failureKm = odometer + (15000 - kmSinceBrake);
      const failureDate = new Date();
      failureDate.setDate(failureDate.getDate() + Math.floor((15000 - kmSinceBrake) / 120));
      predictions.push({
        component: 'Brake Pads',
        health: Math.round(brakeHealth * 100) / 100,
        urgency: brakeHealth < 0.3 ? 'critical' : 'high',
        predictedFailureDate: failureDate.toISOString().split('T')[0],
        predictedFailureKm: failureKm,
        recommendedAction: 'Replace brake pads within 2 weeks',
        riskAssessment: 'High cargo loads + wet season approaching increase stopping distance by 20%',
        estimatedCost: { current: 320, delayed: 780, savings: 460 },
        economicInsight: 'Wet season forecast increases urgency. Delay could cause rotor damage ($780+).',
      });
    }

    // Tire Rotation: every 10000km
    const kmSinceTire = odometer % 10000;
    const tireHealth = 1 - (kmSinceTire / 10000);
    predictions.push({
      component: 'Tires',
      health: Math.round(tireHealth * 100) / 100,
      urgency: tireHealth < 0.3 ? 'high' : tireHealth < 0.6 ? 'medium' : 'low',
      predictedFailureDate: new Date(Date.now() + Math.floor(tireHealth * 90) * 86400000).toISOString().split('T')[0],
      predictedFailureKm: odometer + (10000 - kmSinceTire),
      recommendedAction: tireHealth < 0.3 ? 'Rotate tires immediately' : 'Schedule tire rotation at next service',
      estimatedCost: { current: 200, delayed: 450, savings: 250 },
    });

    // Air Filter: every 20000km
    const kmSinceFilter = odometer % 20000;
    const filterHealth = 1 - (kmSinceFilter / 20000);
    predictions.push({
      component: 'Air Filter',
      health: Math.round(filterHealth * 100) / 100,
      urgency: filterHealth < 0.2 ? 'high' : 'low',
      predictedFailureDate: new Date(Date.now() + Math.floor(filterHealth * 120) * 86400000).toISOString().split('T')[0],
      predictedFailureKm: odometer + (20000 - kmSinceFilter),
      recommendedAction: 'Replace air filter at next service interval',
      estimatedCost: { current: 45, delayed: 65, savings: 20 },
    });

    // Transmission Fluid: every 40000km
    const kmSinceTrans = odometer % 40000;
    const transHealth = 1 - (kmSinceTrans / 40000);
    if (transHealth < 0.5) {
      predictions.push({
        component: 'Transmission Fluid',
        health: Math.round(transHealth * 100) / 100,
        urgency: transHealth < 0.2 ? 'high' : 'medium',
        predictedFailureDate: new Date(Date.now() + Math.floor(transHealth * 180) * 86400000).toISOString().split('T')[0],
        predictedFailureKm: odometer + (40000 - kmSinceTrans),
        recommendedAction: 'Flush transmission fluid and replace filter',
        estimatedCost: { current: 280, delayed: 1500, savings: 1220 },
        economicInsight: 'Transmission damage from neglect averages $1,500+. Preventive flush costs only $280.',
      });
    }

    // Overall health = weighted avg
    const avgHealth = predictions.length > 0
      ? predictions.reduce((sum, p) => sum + p.health, 0) / predictions.length
      : 0.9;

    return {
      vehicleId,
      vehicleReg: vehicle.registration_number,
      healthScore: Math.round(avgHealth * 100),
      predictions: predictions.sort((a, b) => {
        const urgencyOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      }),
      fleetOptimization: avgHealth < 0.6 ? {
        recommendedTripReduction: 0.15,
        alternativeVehicle: mockVehicles.find(v => v.id !== vehicleId && v.status === 'Available')?.registration_number || 'N/A',
        reason: `${vehicle.registration_number} showing stress patterns. Redistribute heavy loads to reduce wear.`,
      } : undefined,
    };
  },

  async getFleetHealth(): Promise<{ vehicleId: string; reg: string; healthScore: number; urgentIssues: number }[]> {
    await delay(500);
    return mockVehicles
      .filter(v => v.status !== 'Retired')
      .map(v => {
        const od = v.odometer;
        const oilH = 1 - ((od % 5000) / 5000);
        const brakeH = 1 - ((od % 15000) / 15000);
        const tireH = 1 - ((od % 10000) / 10000);
        const avg = (oilH + brakeH + tireH) / 3;
        const urgentIssues = [oilH, brakeH, tireH].filter(h => h < 0.3).length;
        return {
          vehicleId: v.id,
          reg: v.registration_number,
          healthScore: Math.round(avg * 100),
          urgentIssues,
        };
      });
  },

  async getInsights(): Promise<{ id: string; type: 'warning' | 'info' | 'success' | 'critical'; message: string; actionable: boolean }[]> {
    await delay(300);
    return [
      { id: 'i1', type: 'warning', message: 'Truck-12 showing 23% higher fuel consumption vs fleet average. Suggest engine check.', actionable: true },
      { id: 'i2', type: 'critical', message: '3 driver licenses expire in next 30 days. Immediate renewal required.', actionable: true },
      { id: 'i3', type: 'info', message: 'Fuel prices trending up 8% this week. Consider locking contract now.', actionable: true },
      { id: 'i4', type: 'success', message: 'Fleet utilization improved 12% this month vs last month.', actionable: false },
      { id: 'i5', type: 'warning', message: 'Van-05 brake pads at 45% life. Schedule replacement within 2 weeks.', actionable: true },
      { id: 'i6', type: 'info', message: 'Optimal batch delivery window: Tue/Thu between 6 AM - 10 AM for 15% cost savings.', actionable: true },
    ];
  },
};

// ============================================
// 5. ECONOMIC INTELLIGENCE SERVICE
// ============================================

export const economicService = {
  async getFuelPrice(): Promise<FuelPriceData> {
    await delay(300);
    return {
      price: 1.45,
      currency: 'USD',
      trend: 'rising',
      changePercent: 3.2,
    };
  },

  async getFuelForecast(): Promise<FuelForecast[]> {
    await delay(400);
    const basePrice = 1.45;
    const forecast: FuelForecast[] = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      // Simulate rising trend with noise
      const trend = i * 0.005;
      const noise = (Math.random() - 0.5) * 0.04;
      forecast.push({
        date: date.toISOString().split('T')[0],
        price: Math.round((basePrice + trend + noise) * 100) / 100,
      });
    }
    return forecast;
  },

  async getLaborIndex(): Promise<{ index: number; trend: string; baselineYear: number }> {
    await delay(200);
    return { index: 1.15, trend: 'rising', baselineYear: 2023 };
  },

  async getPartsAvailability(): Promise<{ status: string; avgLeadTimeDays: number; priceIndex: number }> {
    await delay(200);
    return { status: 'normal', avgLeadTimeDays: 3, priceIndex: 1.08 };
  },

  async simulateScenario(params: {
    fuelPriceChange: number;
    maintenanceCostChange: number;
    fleetSizeChange: number;
    demandChange: number;
  }): Promise<{
    currentMonthlyCost: number;
    simulatedMonthlyCost: number;
    changePercent: number;
    recommendations: { action: string; savings: number; impact: string }[];
    netImpactWithAI: number;
  }> {
    await delay(800);

    const baseCost = 12450;
    const fuelImpact = baseCost * 0.45 * (params.fuelPriceChange / 100);
    const maintImpact = baseCost * 0.30 * (params.maintenanceCostChange / 100);
    const fleetImpact = baseCost * (params.fleetSizeChange / 100);
    const demandImpact = baseCost * 0.15 * (params.demandChange / 100);

    const simulatedCost = baseCost + fuelImpact + maintImpact + fleetImpact + demandImpact;

    const recommendations = [
      { action: `Reduce non-urgent trips by 15%`, savings: Math.round(Math.abs(fuelImpact) * 0.5), impact: 'Reduces fuel burn by routing optimization' },
      { action: 'Shift 3 routes to electric vehicles', savings: Math.round(Math.abs(fuelImpact) * 0.35), impact: 'Zero fuel cost for short-distance routes' },
      { action: 'Batch deliveries on Tue/Thu (low demand)', savings: Math.round(Math.abs(demandImpact) * 0.4 + 560), impact: 'Consolidate trips during off-peak' },
      { action: 'Negotiate fuel contract now (lock price)', savings: Math.round(Math.abs(fuelImpact) * 0.8), impact: 'Hedge against price volatility' },
    ];

    const totalSavings = recommendations.reduce((s, r) => s + r.savings, 0);

    return {
      currentMonthlyCost: baseCost,
      simulatedMonthlyCost: Math.round(simulatedCost),
      changePercent: Math.round(((simulatedCost - baseCost) / baseCost) * 100 * 10) / 10,
      recommendations,
      netImpactWithAI: Math.round(simulatedCost - baseCost - totalSavings),
    };
  },

  /** Optimal service window calculator */
  async calculateOptimalServiceWindow(vehicleId: string, maintenanceType: string): Promise<{
    date: string;
    score: number;
    factors: { fuel: string; weather: string; demand: string; utilization: string };
  }[]> {
    await delay(600);

    const weatherConditions = ['sunny', 'cloudy', 'rain', 'sunny', 'sunny', 'cloudy', 'rain', 'sunny', 'cloudy', 'sunny', 'sunny', 'rain', 'sunny', 'cloudy'];
    const dayScores: { date: string; score: number; factors: { fuel: string; weather: string; demand: string; utilization: string } }[] = [];

    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      let score = 100;

      // Fuel price factor
      const fuelFactor = i > 7 ? 'rising' : 'stable';
      if (fuelFactor === 'rising') score -= 15;

      // Weather factor
      const weather = weatherConditions[i];
      if (weather === 'rain') score -= 10;

      // Demand factor (weekends are low demand)
      const dayOfWeek = date.getDay();
      const demand = (dayOfWeek === 0 || dayOfWeek === 6) ? 'low' : (dayOfWeek === 2 || dayOfWeek === 4) ? 'medium' : 'high';
      if (demand === 'high') score -= 20;
      if (demand === 'low') score += 10;

      // Utilization factor
      const utilization = Math.random() > 0.5 ? 'low' : 'high';
      if (utilization === 'low') score += 10;

      dayScores.push({
        date: date.toISOString().split('T')[0],
        score,
        factors: { fuel: fuelFactor, weather, demand, utilization },
      });
    }

    return dayScores.sort((a, b) => b.score - a.score).slice(0, 7);
  },

  /** Get weather forecast for 14 days */
  async getWeatherForecast(): Promise<{ date: string; condition: string; temperature: number; precipitation: number }[]> {
    await delay(300);
    const conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rain', 'Thunderstorm', 'Sunny', 'Cloudy'];
    const forecast = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      forecast.push({
        date: date.toISOString().split('T')[0],
        condition: conditions[i % conditions.length],
        temperature: 25 + Math.floor(Math.random() * 10),
        precipitation: conditions[i % conditions.length] === 'Rain' || conditions[i % conditions.length] === 'Thunderstorm' ? 10 + Math.random() * 30 : Math.random() * 5,
      });
    }
    return forecast;
  },
};
