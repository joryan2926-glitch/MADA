create extension if not exists pgcrypto;

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  city text,
  engagement_type text,
  message text,
  consent boolean not null default false,
  source_page text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.volunteers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  city text,
  engagement_type text,
  message text,
  consent boolean not null default false,
  source_page text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  city text,
  full_name text,
  consent boolean not null default false,
  source_page text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  subject text,
  message text not null,
  consent boolean not null default false,
  source_page text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.program_contributions (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  theme text not null,
  proposal text not null,
  consent boolean not null default false,
  source_page text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.local_relays (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  city text not null,
  message text,
  consent boolean not null default false,
  source_page text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.donation_intents (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  amount numeric,
  city text,
  message text,
  consent boolean not null default false,
  source_page text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'admin',
  display_name text,
  created_at timestamptz not null default now()
);

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

create table if not exists public.news_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text,
  category text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_by uuid references auth.users(id) default auth.uid(),
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

alter table public.memberships enable row level security;
alter table public.volunteers enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.contacts enable row level security;
alter table public.program_contributions enable row level security;
alter table public.local_relays enable row level security;
alter table public.donation_intents enable row level security;
alter table public.admin_profiles enable row level security;
alter table public.admin_invites enable row level security;
alter table public.news_posts enable row level security;

drop policy if exists "public insert memberships" on public.memberships;
drop policy if exists "public insert volunteers" on public.volunteers;
drop policy if exists "public insert newsletter" on public.newsletter_subscribers;
drop policy if exists "public insert contacts" on public.contacts;
drop policy if exists "public insert program contributions" on public.program_contributions;
drop policy if exists "public insert local relays" on public.local_relays;
drop policy if exists "public insert donation intents" on public.donation_intents;
drop policy if exists "admins read memberships" on public.memberships;
drop policy if exists "admins read volunteers" on public.volunteers;
drop policy if exists "admins read newsletter" on public.newsletter_subscribers;
drop policy if exists "admins read contacts" on public.contacts;
drop policy if exists "admins read program contributions" on public.program_contributions;
drop policy if exists "admins read local relays" on public.local_relays;
drop policy if exists "admins read donation intents" on public.donation_intents;
drop policy if exists "admins read admin profiles" on public.admin_profiles;
drop policy if exists "admins manage admin invites" on public.admin_invites;
drop policy if exists "public read published news" on public.news_posts;
drop policy if exists "admins insert news" on public.news_posts;
drop policy if exists "admins update news" on public.news_posts;
drop policy if exists "admins delete news" on public.news_posts;

create policy "public insert memberships" on public.memberships for insert to anon, authenticated with check (consent = true);
create policy "public insert volunteers" on public.volunteers for insert to anon, authenticated with check (consent = true);
create policy "public insert newsletter" on public.newsletter_subscribers for insert to anon, authenticated with check (consent = true);
create policy "public insert contacts" on public.contacts for insert to anon, authenticated with check (consent = true);
create policy "public insert program contributions" on public.program_contributions for insert to anon, authenticated with check (consent = true);
create policy "public insert local relays" on public.local_relays for insert to anon, authenticated with check (consent = true);
create policy "public insert donation intents" on public.donation_intents for insert to anon, authenticated with check (consent = true);

create policy "admins read memberships" on public.memberships for select to authenticated using (public.is_admin());
create policy "admins read volunteers" on public.volunteers for select to authenticated using (public.is_admin());
create policy "admins read newsletter" on public.newsletter_subscribers for select to authenticated using (public.is_admin());
create policy "admins read contacts" on public.contacts for select to authenticated using (public.is_admin());
create policy "admins read program contributions" on public.program_contributions for select to authenticated using (public.is_admin());
create policy "admins read local relays" on public.local_relays for select to authenticated using (public.is_admin());
create policy "admins read donation intents" on public.donation_intents for select to authenticated using (public.is_admin());

create policy "admins read admin profiles" on public.admin_profiles for select to authenticated using (public.is_admin());
create policy "admins manage admin invites" on public.admin_invites for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "public read published news" on public.news_posts for select to anon, authenticated using (status = 'published' or public.is_admin());
create policy "admins insert news" on public.news_posts for insert to authenticated with check (public.is_admin());
create policy "admins update news" on public.news_posts for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete news" on public.news_posts for delete to authenticated using (public.is_admin());

create index if not exists news_posts_status_published_at_idx on public.news_posts(status, published_at desc);
create index if not exists admin_profiles_email_lower_idx on public.admin_profiles (lower(email));
create index if not exists memberships_created_at_idx on public.memberships(created_at desc);
create index if not exists volunteers_created_at_idx on public.volunteers(created_at desc);
create index if not exists newsletter_created_at_idx on public.newsletter_subscribers(created_at desc);
