-- MADA form security hardening.
-- Apply this after deploying the submit-form Edge Function and setting TURNSTILE_SECRET_KEY.
-- It removes direct public insert policies so public forms must pass server-side Turnstile validation.

drop policy if exists "public insert memberships" on public.memberships;
drop policy if exists "public insert volunteers" on public.volunteers;
drop policy if exists "public insert newsletter" on public.newsletter_subscribers;
drop policy if exists "public insert contacts" on public.contacts;
drop policy if exists "public insert program contributions" on public.program_contributions;
drop policy if exists "public insert local relays" on public.local_relays;
drop policy if exists "public insert commune reports" on public.commune_reports;
drop policy if exists "public insert donation intents" on public.donation_intents;
drop policy if exists "public insert project votes" on public.project_votes;

-- No replacement anon/authenticated insert policy is created here.
-- The Edge Function uses SUPABASE_SERVICE_ROLE_KEY after validating Cloudflare Turnstile.
