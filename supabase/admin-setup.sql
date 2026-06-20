-- Mise a niveau administration MADA
-- A executer dans Supabase SQL Editor apres supabase/schema.sql.
-- Ce script ne cree pas de mot de passe : le mot de passe reste gere dans Supabase Auth.

alter table public.admin_profiles add column if not exists role text not null default 'admin';
alter table public.admin_profiles add column if not exists display_name text;
alter table public.admin_profiles add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'admin_profiles_role_check'
  ) then
    alter table public.admin_profiles
      add constraint admin_profiles_role_check check (role in ('admin', 'owner'));
  end if;
end $$;

create table if not exists public.admin_invites (
  email text primary key,
  role text not null default 'admin' check (role in ('admin', 'owner')),
  display_name text,
  invited_by uuid references auth.users(id),
  used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.admin_profiles
    where user_id = auth.uid()
      and role in ('admin', 'owner')
  );
$$;

create or replace function public.handle_new_admin_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invite record;
begin
  select email, role, display_name
  into invite
  from public.admin_invites
  where lower(email) = lower(new.email)
    and used_at is null
  limit 1;

  if found then
    insert into public.admin_profiles (user_id, email, role, display_name, updated_at)
    values (new.id, new.email, invite.role, invite.display_name, now())
    on conflict (user_id) do update
      set email = excluded.email,
          role = excluded.role,
          display_name = excluded.display_name,
          updated_at = now();

    update public.admin_invites
    set used_at = now(),
        updated_at = now()
    where lower(email) = lower(new.email);
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_admin_profile on auth.users;
create trigger on_auth_user_created_admin_profile
after insert on auth.users
for each row execute function public.handle_new_admin_user();

revoke all on function public.handle_new_admin_user() from anon, authenticated;

alter table public.admin_profiles enable row level security;
alter table public.admin_invites enable row level security;

drop policy if exists "admins read admin profiles" on public.admin_profiles;
drop policy if exists "admins manage admin invites" on public.admin_invites;

create policy "admins read admin profiles" on public.admin_profiles
  for select to authenticated using (public.is_admin());

create policy "admins manage admin invites" on public.admin_invites
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create index if not exists admin_profiles_email_lower_idx
  on public.admin_profiles (lower(email));

-- Compte administrateur officiel MADA.
-- 1. Creer un utilisateur Auth Supabase avec cet email et un mot de passe fort.
-- 2. Si l'utilisateur est cree apres ce script, le trigger creera automatiquement admin_profiles.
-- 3. Si l'utilisateur existe deja, le bloc ci-dessous cree le profil maintenant.

insert into public.admin_invites (email, role, display_name, used_at, updated_at)
values ('contact@mada-martinique.fr', 'owner', 'Administrateur MADA', null, now())
on conflict (email) do update
  set role = excluded.role,
      display_name = excluded.display_name,
      used_at = null,
      updated_at = now();

insert into public.admin_profiles (user_id, email, role, display_name, updated_at)
select id, email, 'owner', 'Administrateur MADA', now()
from auth.users
where lower(email) = lower('contact@mada-martinique.fr')
on conflict (user_id) do update
  set email = excluded.email,
      role = excluded.role,
      display_name = excluded.display_name,
      updated_at = now();

update public.admin_invites
set used_at = now(),
    updated_at = now()
where lower(email) = lower('contact@mada-martinique.fr')
  and exists (
    select 1 from auth.users
    where lower(email) = lower('contact@mada-martinique.fr')
  );
