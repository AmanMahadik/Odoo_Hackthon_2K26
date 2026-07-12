-- Run this script in your Supabase SQL Editor to migrate from Supabase Auth to Clerk Auth.
-- Clerk uses string IDs (e.g. 'user_...') instead of UUIDs, so we must alter our tables to support this.

-- 1. Drop existing triggers and functions related to Supabase Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Drop policies that depend on the UUID columns
DROP POLICY IF EXISTS "Allow profile owner insert" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile owner update" ON public.profiles;
DROP POLICY IF EXISTS "Allow owner read notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow owner update notifications" ON public.notifications;

-- 3. Drop foreign key constraints that rely on the UUID profile ID
ALTER TABLE public.drivers DROP CONSTRAINT IF EXISTS drivers_user_id_fkey;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 4. Change column types from UUID to TEXT
ALTER TABLE public.profiles ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE public.drivers ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE public.notifications ALTER COLUMN user_id TYPE text USING user_id::text;

-- 5. Re-add the foreign key constraints between our public tables
ALTER TABLE public.drivers 
  ADD CONSTRAINT drivers_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.notifications 
  ADD CONSTRAINT notifications_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 6. Recreate the policies using text casting
CREATE POLICY "Allow profile owner insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid()::text = id);
CREATE POLICY "Allow profile owner update" ON public.profiles FOR UPDATE USING (auth.uid()::text = id);
CREATE POLICY "Allow owner read notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid()::text);
CREATE POLICY "Allow owner update notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid()::text);

-- Note: We intentionally do NOT re-add the constraint to auth.users because Clerk is now managing users.
