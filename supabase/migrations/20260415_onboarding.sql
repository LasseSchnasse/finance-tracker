-- Onboarding-Status in Profilen speichern
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Bestehende Nutzer als bereits onboarded markieren
UPDATE public.profiles SET onboarding_completed = true;
