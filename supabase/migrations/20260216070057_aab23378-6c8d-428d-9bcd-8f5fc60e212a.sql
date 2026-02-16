
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'clinic_staff');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  clinic_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Security definer function to get user's clinic
CREATE OR REPLACE FUNCTION public.get_user_clinic(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT clinic_name FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Trigger to auto-create profile on signup (clinic_name from metadata)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, clinic_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'clinic_name', 'Unassigned')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'clinic_staff');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Update clinic_inventory RLS: staff can only modify their clinic's inventory
DROP POLICY IF EXISTS "Authenticated users can insert" ON public.clinic_inventory;
DROP POLICY IF EXISTS "Authenticated users can update" ON public.clinic_inventory;
DROP POLICY IF EXISTS "Authenticated users can delete" ON public.clinic_inventory;

CREATE POLICY "Staff can insert own clinic inventory"
  ON public.clinic_inventory FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    (clinic_name = public.get_user_clinic(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Staff can update own clinic inventory"
  ON public.clinic_inventory FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    (clinic_name = public.get_user_clinic(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Staff can delete own clinic inventory"
  ON public.clinic_inventory FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    (clinic_name = public.get_user_clinic(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  );

-- Timestamp trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_inventory_timestamp();
