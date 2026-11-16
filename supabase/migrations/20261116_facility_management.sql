-- ============================================================================
-- SportHub — Facility Management
-- Additive and re-runnable. No DROP TABLE, no DROP COLUMN, no TRUNCATE, and no
-- data is deleted by this script.
-- Review before running; run it in the Supabase SQL editor.
--
-- Scope:
--   1. facilities.opening_time / closing_time  (daily operating hours)
--   2. facilities.updated_at                   (last change timestamp)
--   3. Check constraints for capacity, price and operating hours
--   4. updated_at trigger (reuses public.sh_set_updated_at)
--   5. RLS: every signed-in role can read; only admins can write
--   6. Index for the status filter used by the facility list
--
-- Why RLS now: the facility catalogue is visible to customers, trainers and
-- admins only (the /facilities area requires sign-in). The previous schema let
-- anonymous requests read public.facilities, which this closes.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1 + 2. Operating hours and change tracking.
--    ADD COLUMN with a constant default is a metadata-only change on modern
--    PostgreSQL, so existing rows are backfilled without a table rewrite.
-- ---------------------------------------------------------------------------
alter table public.facilities
  add column if not exists opening_time time not null default '08:00',
  add column if not exists closing_time time not null default '23:00',
  add column if not exists updated_at   timestamptz not null default now();

comment on column public.facilities.opening_time is
  'Daily opening time in the centre timezone (Asia/Kuala_Lumpur).';
comment on column public.facilities.closing_time is
  'Daily closing time in the centre timezone. Must be after opening_time.';

-- ---------------------------------------------------------------------------
-- 3. Validation at the database level.
--    NOT VALID enforces the rule for every new INSERT/UPDATE while leaving any
--    legacy row untouched, so this migration cannot fail on old demo data.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'facilities_hours_check'
      and conrelid = 'public.facilities'::regclass
  ) then
    alter table public.facilities
      add constraint facilities_hours_check
      check (opening_time < closing_time) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'facilities_capacity_check'
      and conrelid = 'public.facilities'::regclass
  ) then
    alter table public.facilities
      add constraint facilities_capacity_check
      check (capacity is null or capacity > 0) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'facilities_rate_check'
      and conrelid = 'public.facilities'::regclass
  ) then
    alter table public.facilities
      add constraint facilities_rate_check
      check (hourly_rate >= 0) not valid;
  end if;
end $$;

-- Speeds up the list's status filter and name ordering.
create index if not exists facilities_status_name_idx
  on public.facilities (status, name);

-- ---------------------------------------------------------------------------
-- 4. Keep updated_at accurate. The helper was introduced by the customer
--    management migration; it is re-created here so this script also works on
--    a database that has not run that one yet.
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

create or replace trigger facilities_set_updated_at
  before update on public.facilities
  for each row execute function public.sh_set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Admin check used by the write policies.
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
-- 6. Row level security.
--    authenticated: SELECT every facility (customers + trainers + admins).
--    authenticated admin: INSERT / UPDATE / DELETE.
--    anon: no privileges at all.
-- ---------------------------------------------------------------------------
alter table public.facilities enable row level security;

revoke all on table public.facilities from public;
revoke all on table public.facilities from anon;
grant select, insert, update, delete
  on table public.facilities
  to authenticated;

drop policy if exists facilities_select on public.facilities;
create policy facilities_select
  on public.facilities
  for select
  to authenticated
  using (true);

drop policy if exists facilities_insert on public.facilities;
create policy facilities_insert
  on public.facilities
  for insert
  to authenticated
  with check (public.sh_is_admin());

drop policy if exists facilities_update on public.facilities;
create policy facilities_update
  on public.facilities
  for update
  to authenticated
  using (public.sh_is_admin())
  with check (public.sh_is_admin());

drop policy if exists facilities_delete on public.facilities;
create policy facilities_delete
  on public.facilities
  for delete
  to authenticated
  using (public.sh_is_admin());

commit;

-- Ask PostgREST to refresh its schema cache immediately, so the app can read
-- the new columns without waiting for the automatic reload.
notify pgrst, 'reload schema';

-- ============================================================================
-- Verification (read-only; safe to run after the migration)
-- ============================================================================
-- select column_name, data_type, is_nullable, column_default
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'facilities'
-- order by ordinal_position;

-- select conname, pg_get_constraintdef(oid) as definition
-- from pg_constraint
-- where conrelid = 'public.facilities'::regclass
--   and conname like 'facilities_%'
-- order by conname;

-- select relrowsecurity from pg_class where relname = 'facilities';

-- select policyname, cmd, roles, qual, with_check
-- from pg_policies
-- where schemaname = 'public' and tablename = 'facilities'
-- order by policyname;
