ALTER TABLE public.profiles ALTER COLUMN approved SET DEFAULT true;
UPDATE public.profiles SET approved = true WHERE approved = false;