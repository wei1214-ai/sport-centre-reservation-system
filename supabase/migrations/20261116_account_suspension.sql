-- ============================================================================
-- SportHub — Account suspension (admin control over customer/trainer accounts)
-- Additive and re-runnable. No table is dropped, no row is deleted, and no
-- existing column is changed. Run it in the Supabase SQL editor.
--
-- Scope:
--   1. user_profiles.suspended_at / suspended_reason / suspended_by
--   2. Guard trigger: only administrators may change role / is_active / deleted_at
--   3. Index for the admin account directory filters
--
-- Why a trigger instead of disabling the feature in code:
--   The admin screens are protected server-side, but `user_profiles` has no RLS
--   yet (registration inserts the profile before a session exists). Without a
--   database guard, a suspended user could PATCH their own row and set
--   is_active = true, or even change their role, using the public key.
--   This trigger closes that hole for exactly the three sensitive columns while
--   leaving normal profile edits (name, phone, contact email) working.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Suspension metadata.
--    ADD COLUMN with no default is metadata-only: existing rows simply see NULL.
-- ---------------------------------------------------------------------------
alter table public.user_profiles
  add column if not exists suspended_at     timestamptz,
  add column if not exists suspended_reason text,
  add column if not exists suspended_by     uuid;

comment on column public.user_profiles.suspended_at is
  'When an administrator suspended the account. NULL while the account is active.';
comment on column public.user_profiles.suspended_reason is
  'Administrator-only note explaining the suspension. Cleared on reactivation.';
comment on column public.user_profiles.suspended_by is
  'user_profiles.id of the administrator who suspended the account.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'user_profiles_suspended_by_fkey'
      and conrelid = 'public.user_profiles'::regclass
  ) then
    alter table public.user_profiles
      add constraint user_profiles_suspended_by_fkey
      foreign key (suspended_by) references public.user_profiles (id)
      on delete set null
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'user_profiles_suspended_reason_check'
      and conrelid = 'public.user_profiles'::regclass
  ) then
    alter table public.user_profiles
      add constraint user_profiles_suspended_reason_check
      check (suspended_reason is null or char_length(suspended_reason) <= 300)
      not valid;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Fast role/status filtering for the account directory.
-- ---------------------------------------------------------------------------
create index if not exists user_profiles_role_active_idx
  on public.user_profiles (role, is_active)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- 3. Admin check.
--    Re-created defensively so this script also works before the facility
--    migration. Same definition as in 20261116_facility_management.sql.
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

revoke all on function public.sh_is_admin() from public;
grant execute on function public.sh_is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Guard: role and account status are administrator-only.
--    - Administrators (sh_is_admin) may change anything.
--    - A customer may still delete their own account: the RPC anonymises the
--      row and sets is_active = false + deleted_at in the same statement.
--    - Everything else keeps working (name, phone, contact email, fitness
--      details); only role / is_active / deleted_at are protected.
-- ---------------------------------------------------------------------------
create or replace function public.sh_guard_profile_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is not distinct from old.role
     and new.is_active is not distinct from old.is_active
     and new.deleted_at is not distinct from old.deleted_at then
    return new;
  end if;

  if public.sh_is_admin() then
    return new;
  end if;

  if old.auth_user_id = auth.uid()
     and new.is_active = false
     and new.deleted_at is not null
     and new.role is not distinct from old.role then
    return new;
  end if;

  raise exception 'Only administrators can change an account role or status'
    using errcode = '42501';
end;
$$;

drop trigger if exists user_profiles_guard_access on public.user_profiles;
create trigger user_profiles_guard_access
  before update on public.user_profiles
  for each row execute function public.sh_guard_profile_access();

commit;

-- Refresh PostgREST's schema cache so the new columns are usable immediately.
notify pgrst, 'reload schema';

-- ============================================================================
-- Verification (read-only; safe to run after the migration)
-- ============================================================================
-- select column_name, data_type, is_nullable
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'user_profiles'
--   and column_name like 'suspended%';
--
-- select tgname from pg_trigger
-- where tgrelid = 'public.user_profiles'::regclass and not tgisinternal;
--
-- select id, full_name, role, is_active, suspended_at, suspended_reason
-- from public.user_profiles
-- where role in ('customer', 'trainer')
-- order by is_active, full_name;

-- ============================================================================
-- Optional hardening, NOT enabled here.
--
-- `user_profiles` still has no RLS, so anonymous requests can currently read
-- every profile row. Turning RLS on fixes that, but registration inserts the
-- profile before a session exists, so it needs profile creation moved into an
-- auth.users trigger first. Enable it only as a tested, separate change:
--
--   alter table public.user_profiles enable row level security;
--   create policy user_profiles_select on public.user_profiles
--     for select to authenticated
--     using (auth_user_id = auth.uid() or public.sh_is_admin());
--   -- ... insert/update policies depend on the registration trigger.
-- ============================================================================
