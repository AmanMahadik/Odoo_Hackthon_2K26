-- ============================================
-- TRANSITOPS - SUPABASE INITIAL SCHEMA
-- Paste this into the Supabase SQL Editor
-- ============================================

-- 1. Create Profiles table (Clerk Auth IDs are text)
create table if not exists public.profiles (
  id text primary key,
  full_name text not null,
  role text not null check (role in ('Fleet Manager', 'Driver', 'Safety Officer', 'Financial Analyst')),
  email text,
  contact_number text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Vehicles table
create table if not exists public.vehicles (
  id uuid default gen_random_uuid() primary key,
  registration_number text unique not null,
  model text not null,
  type text not null check (type in ('Van', 'Truck', 'Bike', 'Car', 'Bus')),
  max_load_capacity numeric not null, -- in kg
  odometer numeric default 0 not null, -- in km
  acquisition_cost numeric not null,
  status text default 'Available' not null check (status in ('Available', 'On Trip', 'In Shop', 'Retired')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Drivers table
create table if not exists public.drivers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  license_number text unique not null,
  license_category text not null,
  license_expiry_date date not null,
  contact_number text,
  safety_score numeric default 100 not null,
  status text default 'Available' not null check (status in ('Available', 'On Trip', 'Off Duty', 'Suspended')),
  user_id text references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Create Trips table
create table if not exists public.trips (
  id uuid default gen_random_uuid() primary key,
  trip_number serial unique not null,
  source text not null,
  destination text not null,
  vehicle_id uuid references public.vehicles(id) not null,
  driver_id uuid references public.drivers(id) not null,
  cargo_weight numeric not null, -- in kg
  planned_distance numeric not null, -- in km
  actual_distance numeric,
  status text default 'Draft' not null check (status in ('Draft', 'Dispatched', 'Completed', 'Cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Create Maintenance Logs table
create table if not exists public.maintenance_logs (
  id uuid default gen_random_uuid() primary key,
  vehicle_id uuid references public.vehicles(id) on delete cascade not null,
  description text not null,
  cost numeric default 0 not null,
  status text default 'Open' not null check (status in ('Open', 'Closed')),
  opened_at timestamp with time zone default timezone('utc'::text, now()) not null,
  closed_at timestamp with time zone
);

-- 6. Create Fuel Logs table
create table if not exists public.fuel_logs (
  id uuid default gen_random_uuid() primary key,
  vehicle_id uuid references public.vehicles(id) on delete cascade not null,
  trip_id uuid references public.trips(id) on delete set null,
  liters numeric not null,
  cost numeric not null,
  log_date date default current_date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Create Expenses table
create table if not exists public.expenses (
  id uuid default gen_random_uuid() primary key,
  vehicle_id uuid references public.vehicles(id) on delete cascade not null,
  trip_id uuid references public.trips(id) on delete set null,
  type text not null check (type in ('toll', 'repair', 'misc')),
  amount numeric not null,
  expense_date date default current_date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Create Notifications table
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id text references public.profiles(id) on delete cascade not null,
  type text not null,
  message text not null,
  read_status boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Create Documents table
create table if not exists public.documents (
  id uuid default gen_random_uuid() primary key,
  entity_type text not null check (entity_type in ('vehicle', 'driver')),
  entity_id uuid not null,
  storage_path text not null,
  doc_type text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================

-- A. Auto Profile Creation on auth.users Sign Up
-- (Removed because we are using Clerk Auth, which handles users externally)

-- B. Trip Status Transition Engine
create or replace function public.process_trip_status_transition()
returns trigger as $$
declare
  v_status text;
  v_max_load numeric;
  d_status text;
  d_license_expiry date;
begin
  -- Fetch current status and capacity of vehicle
  select status, max_load_capacity into v_status, v_max_load
  from public.vehicles where id = new.vehicle_id;

  -- Fetch current status and license expiry of driver
  select status, license_expiry_date into d_status, d_license_expiry
  from public.drivers where id = new.driver_id;

  -- Transitioning to Dispatched
  if (tg_op = 'INSERT' and new.status = 'Dispatched') or 
     (tg_op = 'UPDATE' and old.status <> 'Dispatched' and new.status = 'Dispatched') then
    
    if v_status <> 'Available' then
      raise exception 'Vehicle is not available (Current status: %)', v_status;
    end if;

    if d_status <> 'Available' then
      raise exception 'Driver is not available (Current status: %)', d_status;
    end if;

    if d_license_expiry < current_date then
      raise exception 'Driver license is expired (Expiry date: %)', d_license_expiry;
    end if;

    if new.cargo_weight > v_max_load then
      raise exception 'Cargo weight (%) exceeds vehicle max capacity (%)', new.cargo_weight, v_max_load;
    end if;

    -- Update vehicle and driver status to 'On Trip'
    update public.vehicles set status = 'On Trip' where id = new.vehicle_id;
    update public.drivers set status = 'On Trip' where id = new.driver_id;

  end if;

  -- Transitioning to Completed
  if tg_op = 'UPDATE' and old.status = 'Dispatched' and new.status = 'Completed' then
    update public.vehicles set status = 'Available' where id = new.vehicle_id;
    update public.drivers set status = 'Available' where id = new.driver_id;
  end if;

  -- Transitioning to Cancelled
  if tg_op = 'UPDATE' and old.status = 'Dispatched' and new.status = 'Cancelled' then
    update public.vehicles set status = 'Available' where id = new.vehicle_id;
    update public.drivers set status = 'Available' where id = new.driver_id;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_trip_status_transition on public.trips;
create trigger trg_trip_status_transition
  before insert or update on public.trips
  for each row execute procedure public.process_trip_status_transition();

-- C. Maintenance Status Transition Engine
create or replace function public.process_maintenance_status_transition()
returns trigger as $$
declare
  v_status text;
begin
  select status into v_status from public.vehicles where id = new.vehicle_id;

  if tg_op = 'INSERT' and new.status = 'Open' then
    if v_status = 'On Trip' then
      raise exception 'Cannot put vehicle in maintenance while on a trip';
    end if;
    update public.vehicles set status = 'In Shop' where id = new.vehicle_id;
  end if;

  if tg_op = 'UPDATE' and old.status = 'Open' and new.status = 'Closed' then
    -- restore to Available if not Retired
    update public.vehicles 
    set status = case when status = 'Retired' then 'Retired' else 'Available' end 
    where id = new.vehicle_id;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_maintenance_status_transition on public.maintenance_logs;
create trigger trg_maintenance_status_transition
  before insert or update on public.maintenance_logs
  for each row execute procedure public.process_maintenance_status_transition();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.drivers enable row level security;
alter table public.trips enable row level security;
alter table public.maintenance_logs enable row level security;
alter table public.fuel_logs enable row level security;
alter table public.expenses enable row level security;
alter table public.notifications enable row level security;
alter table public.documents enable row level security;

-- Helper function to fetch authenticated user's role
create or replace function public.get_auth_role()
returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql security definer;

-- Profiles policies
create policy "Allow authenticated select profiles" on public.profiles for select using (auth.role() = 'authenticated');
create policy "Allow profile owner insert" on public.profiles for insert with check (auth.uid()::text = id);
create policy "Allow profile owner update" on public.profiles for update using (auth.uid()::text = id);

-- Vehicles policies
create policy "Allow auth read vehicles" on public.vehicles for select using (auth.role() = 'authenticated');
create policy "Allow Fleet Manager modify vehicles" on public.vehicles for all using (public.get_auth_role() = 'Fleet Manager') with check (public.get_auth_role() = 'Fleet Manager');

-- Drivers policies
create policy "Allow auth read drivers" on public.drivers for select using (auth.role() = 'authenticated');
create policy "Allow managers modify drivers" on public.drivers for all using (public.get_auth_role() IN ('Fleet Manager', 'Safety Officer')) with check (public.get_auth_role() IN ('Fleet Manager', 'Safety Officer'));

-- Trips policies
create policy "Allow auth read trips" on public.trips for select using (auth.role() = 'authenticated');
create policy "Allow managers modify trips" on public.trips for all using (public.get_auth_role() IN ('Fleet Manager', 'Dispatcher', 'Driver')) with check (public.get_auth_role() IN ('Fleet Manager', 'Dispatcher', 'Driver'));

-- Maintenance logs policies
create policy "Allow auth read maintenance" on public.maintenance_logs for select using (auth.role() = 'authenticated');
create policy "Allow managers modify maintenance" on public.maintenance_logs for all using (public.get_auth_role() IN ('Fleet Manager', 'Safety Officer')) with check (public.get_auth_role() IN ('Fleet Manager', 'Safety Officer'));

-- Fuel logs policies
create policy "Allow auth read fuel_logs" on public.fuel_logs for select using (auth.role() = 'authenticated');
create policy "Allow managers modify fuel_logs" on public.fuel_logs for all using (public.get_auth_role() IN ('Fleet Manager', 'Dispatcher', 'Driver', 'Financial Analyst')) with check (public.get_auth_role() IN ('Fleet Manager', 'Dispatcher', 'Driver', 'Financial Analyst'));

-- Expenses policies
create policy "Allow auth read expenses" on public.expenses for select using (auth.role() = 'authenticated');
create policy "Allow managers modify expenses" on public.expenses for all using (public.get_auth_role() IN ('Fleet Manager', 'Financial Analyst')) with check (public.get_auth_role() IN ('Fleet Manager', 'Financial Analyst'));

-- Notifications policies
create policy "Allow owner read notifications" on public.notifications for select using (user_id = auth.uid()::text);
create policy "Allow auth insert notifications" on public.notifications for insert with check (auth.role() = 'authenticated');
create policy "Allow owner update notifications" on public.notifications for update using (user_id = auth.uid()::text);

-- Documents policies
create policy "Allow auth read documents" on public.documents for select using (auth.role() = 'authenticated');
create policy "Allow managers modify documents" on public.documents for all using (public.get_auth_role() IN ('Fleet Manager', 'Safety Officer')) with check (public.get_auth_role() IN ('Fleet Manager', 'Safety Officer'));

-- ============================================
-- SEED DATA
-- ============================================
-- No initial dummy seeds are inserted. Create assets directly via the UI admin registry panels.
