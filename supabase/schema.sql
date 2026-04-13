-- ============================================================
-- AI Finance Tracker — Supabase Schema
-- Führe dieses SQL im Supabase SQL Editor aus (supabase.com)
-- ============================================================

-- 1. PROFILES
-- Erweitert den Supabase Auth User um app-spezifische Daten.
-- webhook_secret ist die UUID, die in der Webhook-URL steht.
create table public.profiles (
  id            uuid references auth.users(id) on delete cascade primary key,
  webhook_secret uuid not null default gen_random_uuid() unique,
  created_at    timestamptz not null default now()
);

-- Automatisch ein Profil erstellen, sobald sich ein User registriert
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. CATEGORIES
-- Vordefinierte + nutzerspezifische Kategorien.
-- user_id = null bedeutet: globale Standard-Kategorie
create table public.categories (
  id         uuid not null default gen_random_uuid() primary key,
  user_id    uuid references auth.users(id) on delete cascade,
  name       text not null,
  color      text not null default '#6b7280',
  icon       text not null default '💳',
  created_at timestamptz not null default now(),
  unique(user_id, name)
);

-- Standard-Kategorien (global, user_id = null)
insert into public.categories (id, user_id, name, color, icon) values
  (gen_random_uuid(), null, 'Lebensmittel',   '#22c55e', '🛒'),
  (gen_random_uuid(), null, 'Restaurant',     '#f97316', '🍽️'),
  (gen_random_uuid(), null, 'Transport',      '#3b82f6', '🚗'),
  (gen_random_uuid(), null, 'Shopping',       '#a855f7', '🛍️'),
  (gen_random_uuid(), null, 'Gesundheit',     '#ef4444', '💊'),
  (gen_random_uuid(), null, 'Unterhaltung',   '#eab308', '🎬'),
  (gen_random_uuid(), null, 'Wohnen',         '#14b8a6', '🏠'),
  (gen_random_uuid(), null, 'Versicherung',   '#64748b', '🔒'),
  (gen_random_uuid(), null, 'Sonstiges',      '#9ca3af', '📋');

-- 3. TRANSACTIONS
-- Kern-Tabelle. Jede Transaktion gehört einem User.
create table public.transactions (
  id             uuid not null default gen_random_uuid() primary key,
  user_id        uuid not null references auth.users(id) on delete cascade,
  amount         numeric(12, 2) not null,                        -- positiv = Eingang, negativ = Ausgang
  currency       text not null default 'EUR',
  merchant       text,                                           -- z.B. "REWE", "Amazon"
  category_id    uuid references public.categories(id),
  raw_text       text not null,                                  -- Original Push-Notification Text
  ai_confidence  numeric(4, 3),                                  -- 0.000–1.000, Claude-Confidence
  transacted_at  timestamptz not null default now(),             -- Zeitpunkt der Transaktion
  created_at     timestamptz not null default now()              -- Zeitpunkt des Eingangs im System
);

-- Index für schnelle Dashboard-Abfragen (User + Zeitraum)
create index transactions_user_date_idx
  on public.transactions(user_id, transacted_at desc);

-- 4. ROW LEVEL SECURITY (RLS)
-- Kritisch: Jeder User sieht nur seine eigenen Daten.

alter table public.profiles     enable row level security;
alter table public.categories   enable row level security;
alter table public.transactions enable row level security;

-- Profiles: nur eigenes Profil
create policy "users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Categories: eigene + globale (user_id = null)
create policy "users can view own and global categories"
  on public.categories for select
  using (user_id = auth.uid() or user_id is null);

create policy "users can manage own categories"
  on public.categories for all
  using (user_id = auth.uid());

-- Transactions: nur eigene
create policy "users can view own transactions"
  on public.transactions for select
  using (user_id = auth.uid());

create policy "users can insert own transactions"
  on public.transactions for insert
  with check (user_id = auth.uid());

-- SERVICE ROLE darf alles (für den Webhook-Endpunkt mit service_role key)
create policy "service role full access to transactions"
  on public.transactions for all
  using (true)
  with check (true);
