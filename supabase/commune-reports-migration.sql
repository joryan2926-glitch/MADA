-- MADA - Signalements communaux.
-- Migration sure : ne supprime aucune donnee existante.

create table if not exists public.commune_reports (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  city text not null,
  issue_type text not null,
  subject text,
  message text not null,
  consent boolean not null default false,
  source_page text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.commune_reports enable row level security;

drop policy if exists "public insert commune reports" on public.commune_reports;
drop policy if exists "admins read commune reports" on public.commune_reports;

-- Les insertions publiques restent bloquees par RLS.
-- Les formulaires passent par l'Edge Function submit-form apres validation Turnstile.
create policy "admins read commune reports"
on public.commune_reports
for select
to authenticated
using (public.is_admin());

create index if not exists commune_reports_city_created_idx
on public.commune_reports(city, created_at desc);
