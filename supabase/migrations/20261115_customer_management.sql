-- ============================================================================
-- SportHub — Customer Management (customer account)
-- Additive and re-runnable. No DROP TABLE, no TRUNCATE, and this migration
-- itself deletes nothing. The self-deletion function below deletes personal
-- rows only when a signed-in customer explicitly calls it.
-- Review before running; run it in the Supabase SQL editor.
--
-- Scope:
--   1. customer_fitness_profiles (new 1:1 table, owner/admin RLS)
--   2. user_profiles.deleted_at (nullable marker for self-deletion)
--   3. updated_at trigger for the new table
--   4. sh_* security-definer helpers for the RLS policies
--   5. delete_my_customer_account() atomic anonymize + deactivate RPC
--   6. table privileges for the new table
--
-- Deliberately NOT included:
--   RLS on public.user_profiles. Registration currently inserts the profile
--   before the user has a session (email confirmation is enabled), so enabling
--   RLS there requires moving profile creation into an auth.users trigger.
--   That is a separate change and should be tested on its own.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Customer fitness profile: one optional row per customer profile.
-- ---------------------------------------------------------------------------
create table if not exists public.customer_fitness_profiles (
  id                      uuid primary key default gen_random_uuid(),
  customer_id             uuid not null unique
                          references public.user_profiles (id) on delete cascade,
  height_cm               numeric(5,1)
                          check (height_cm is null or height_cm between 50 and 250),
  weight_kg               numeric(5,1)
                          check (weight_kg is null or weight_kg between 20 and 300),
  fitness_level           text
                          check (fitness_level is null
                                 or fitness_level in ('beginner', 'intermediate', 'advanced')),
  fitness_goals           text,
  medical_conditions      text,
  emergency_contact_name  text,
  emergency_contact_phone text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

comment on table public.customer_fitness_profiles is
  'Optional fitness details for a customer. One row per public.user_profiles row.';
comment on column public.customer_fitness_profiles.customer_id is
  'References public.user_profiles.id (not auth.users.id).';

-- ---------------------------------------------------------------------------
-- 2. Account deletion marker.
--    ADD COLUMN with no default is a metadata-only change: PostgreSQL does not
--    rewrite the table, and existing rows simply see NULL.
-- ---------------------------------------------------------------------------
alter table public.user_profiles
  add column if not exists deleted_at timestamptz;

comment on column public.user_profiles.deleted_at is
  'Set when a customer deletes their account. PII is anonymized, is_active=false, and booking/payment history is retained.';

-- Speeds up the admin "customers" list (role + newest first, excluding deleted).
create index if not exists user_profiles_customers_idx
  on public.user_profiles (role, created_at desc)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- 3. Keep updated_at accurate on the new table.
--    Names are prefixed with "sh_" so nothing that may already exist in the
--    project is replaced by accident.
-- ---------------------------------------------------------------------------
create or replace function public.sh_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace trigger customer_fitness_profiles_set_updated_at
  before update on public.customer_fitness_profiles
  for each row execute function public.sh_set_updated_at();

-- NOTE: no trigger is added to public.user_profiles. That existing table is
-- only extended with a nullable column; the app sets updated_at explicitly.

-- ---------------------------------------------------------------------------
-- 4. Small security-definer helpers used by the fitness RLS policies.
--    Names are prefixed with "sh_" (SportHub) so they cannot clash with any
--    helper that may already exist in the project.
-- ---------------------------------------------------------------------------
create or replace function public.sh_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
      and p.is_active = true
      and p.deleted_at is null
  );
$$;

create or replace function public.sh_current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.user_profiles p
  where p.auth_user_id = auth.uid()
    and p.is_active = true
    and p.deleted_at is null
  limit 1;
$$;

revoke all on function public.sh_is_admin() from public;
revoke all on function public.sh_current_profile_id() from public;
grant execute on function public.sh_is_admin() to authenticated;
grant execute on function public.sh_current_profile_id() to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Atomic self-deletion.
--    One transaction: remove personal child rows, redact chat content, then
--    anonymize + deactivate the profile. Booking/payment/enrollment rows stay.
--    SECURITY DEFINER lets the function update the profile's own sensitive
--    columns without granting customers broad UPDATE rights.
-- ---------------------------------------------------------------------------
create or replace function public.delete_my_customer_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.user_profiles%rowtype;
begin
  select *
    into v_profile
    from public.user_profiles
   where auth_user_id = auth.uid()
     and role = 'customer'
     and deleted_at is null
   limit 1;

  if not found then
    raise exception 'No active customer account found';
  end if;

  delete from public.customer_fitness_profiles where customer_id = v_profile.id;
  delete from public.training_plans          where customer_id = v_profile.id;
  delete from public.notifications            where user_id     = v_profile.id;
  delete from public.class_inquiries          where customer_id = v_profile.id;

  -- Keep the conversation readable for everyone else.
  update public.chat_messages
     set message = '[message removed]'
   where sender_id = v_profile.id;

  update public.user_profiles
     set full_name    = 'Deleted customer',
         email        = 'deleted+' || v_profile.id || '@deleted.invalid',
         phone        = null,
         gender       = null,
         date_of_birth = null,
         avatar_url   = null,
         is_active    = false,
         deleted_at   = now(),
         updated_at   = now()
   where id = v_profile.id;
end;
$$;

revoke all on function public.delete_my_customer_account() from public;
grant execute on function public.delete_my_customer_account() to authenticated;

-- ---------------------------------------------------------------------------
-- 6. RLS for the new table only.
--    Anonymous access is removed entirely; signed-in customers see/change only
--    their own row; admins can manage every row.
-- ---------------------------------------------------------------------------
alter table public.customer_fitness_profiles enable row level security;

-- Remove every inherited privilege first, then grant only what the app needs.
revoke all on table public.customer_fitness_profiles from public;
revoke all on table public.customer_fitness_profiles from anon;
grant select, insert, update, delete
  on table public.customer_fitness_profiles
  to authenticated;

drop policy if exists customer_fitness_select on public.customer_fitness_profiles;
create policy customer_fitness_select
  on public.customer_fitness_profiles
  for select
  to authenticated
  using (
    public.sh_is_admin()
    or customer_id = public.sh_current_profile_id()
  );

drop policy if exists customer_fitness_insert on public.customer_fitness_profiles;
create policy customer_fitness_insert
  on public.customer_fitness_profiles
  for insert
  to authenticated
  with check (
    public.sh_is_admin()
    or customer_id = public.sh_current_profile_id()
  );

drop policy if exists customer_fitness_update on public.customer_fitness_profiles;
create policy customer_fitness_update
  on public.customer_fitness_profiles
  for update
  to authenticated
  using (
    public.sh_is_admin()
    or customer_id = public.sh_current_profile_id()
  )
  with check (
    public.sh_is_admin()
    or customer_id = public.sh_current_profile_id()
  );

drop policy if exists customer_fitness_delete on public.customer_fitness_profiles;
create policy customer_fitness_delete
  on public.customer_fitness_profiles
  for delete
  to authenticated
  using (
    public.sh_is_admin()
    or customer_id = public.sh_current_profile_id()
  );

commit;

-- Ask PostgREST to refresh its schema cache immediately, so the app can query
-- the new table/column without waiting for the automatic reload.
notify pgrst, 'reload schema';

-- ============================================================================
-- Verification (read-only; safe to run after the migration)
-- ============================================================================
-- select column_name, data_type, is_nullable
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name in ('customer_fitness_profiles', 'user_profiles')
-- order by table_name, ordinal_position;

-- select relname, relrowsecurity
-- from pg_class
-- where relname = 'customer_fitness_profiles';

-- select proname
-- from pg_proc p
-- join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and p.proname in ('sh_is_admin', 'sh_current_profile_id', 'delete_my_customer_account')
-- order by proname;

-- select tgname, tgrelid::regclass
-- from pg_trigger
-- where not tgisinternal
--   and tgrelid in ('public.user_profiles'::regclass,
--                   'public.customer_fitness_profiles'::regclass)
-- order by tgrelid::regclass::text, tgname;

-- select policyname, cmd, roles
-- from pg_policies
-- where schemaname = 'public'
--   and tablename = 'customer_fitness_profiles'
-- order by policyname;
