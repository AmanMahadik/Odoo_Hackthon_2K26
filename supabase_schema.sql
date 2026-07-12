-- ============================================
-- TRANSITOPS - SUPABASE INITIAL SCHEMA
-- Paste this into the Supabase SQL Editor
-- ============================================

-- 1. Create Profiles table (Linked to Auth.Users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role text not null check (role in ('Fleet Manager', 'Driver', 'Safety Officer', 'Financial Analyst')),
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
  user_id uuid references public.profiles(id) on delete set null,
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
  user_id uuid references public.profiles(id) on delete cascade not null,
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
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id, 
    coalesce(new.raw_user_meta_data->>'full_name', 'System User'), 
    coalesce(new.raw_user_meta_data->>'role', 'Fleet Manager')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Recreate trigger if exists
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

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

-- Open policies for hackathon client demo operations
create policy "Enable read for all" on public.profiles for select using (true);
create policy "Enable all for all" on public.profiles for all using (true) with check (true);

create policy "Enable read for all" on public.vehicles for select using (true);
create policy "Enable all for all" on public.vehicles for all using (true) with check (true);

create policy "Enable read for all" on public.drivers for select using (true);
create policy "Enable all for all" on public.drivers for all using (true) with check (true);

create policy "Enable read for all" on public.trips for select using (true);
create policy "Enable all for all" on public.trips for all using (true) with check (true);

create policy "Enable read for all" on public.maintenance_logs for select using (true);
create policy "Enable all for all" on public.maintenance_logs for all using (true) with check (true);

create policy "Enable read for all" on public.fuel_logs for select using (true);
create policy "Enable all for all" on public.fuel_logs for all using (true) with check (true);

create policy "Enable read for all" on public.expenses for select using (true);
create policy "Enable all for all" on public.expenses for all using (true) with check (true);

create policy "Enable read for all" on public.notifications for select using (true);
create policy "Enable all for all" on public.notifications for all using (true) with check (true);

create policy "Enable read for all" on public.documents for select using (true);
create policy "Enable all for all" on public.documents for all using (true) with check (true);

-- ============================================
-- SEED DATA
-- ============================================

-- Vehicles
insert into public.vehicles (registration_number, model, type, max_load_capacity, odometer, acquisition_cost, status) values
('VAN-05', 'Ford Transit 2022', 'Van', 1200, 12500, 35000, 'Available'),
('TRK-12', 'Isuzu NPR 2021', 'Truck', 5000, 45000, 65000, 'Available'),
('BIK-01', 'Honda CB500X', 'Bike', 150, 8000, 8000, 'Available'),
('VAN-03', 'Mercedes Sprinter', 'Van', 1500, 32000, 48000, 'Available')
on conflict (registration_number) do nothing;

-- Drivers
insert into public.drivers (name, license_number, license_category, license_expiry_date, contact_number, safety_score, status) values
('Alex Johnson', 'DL-2024-001', 'Heavy Vehicle', '2027-08-15', '+1-555-0101', 95, 'Available'),
('Sarah Chen', 'DL-2024-002', 'Heavy Vehicle', '2026-03-20', '+1-555-0102', 88, 'Available'),
('Mike Ross', 'DL-2023-003', 'Light Vehicle', '2028-01-10', '+1-555-0103', 72, 'Available')
on conflict (license_number) do nothing;
