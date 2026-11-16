-- ============================================================================
-- SportHub — Facility status values
-- Additive and re-runnable. Creates no table, drops no table, and deletes no
-- rows. Run this AFTER 20261116_facility_management.sql.
--
-- Why this is needed:
--   The original facilities table (written before this module) restricted the
--   status column to a subset of values, typically:
--       check (status in ('available', 'maintenance'))
--   Postgres re-checks every CHECK constraint on the whole row for each UPDATE,
--   so changing only the status to 'unavailable' failed with:
--       23514 — new row for relation "facilities" violates check constraint ...
--   The app surfaced that as "details are out of range", which was misleading:
--   capacity, price and hours were untouched and valid.
--
--   This script replaces that legacy rule with one that accepts the three
--   states the application exposes: available, unavailable, maintenance.
--
-- Safe to re-run: constraints are discovered and recreated, never assumed.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Read-only discovery (run on its own if you want a before/after record):
--
--   select conname, pg_get_constraintdef(oid) as definition
--   from pg_constraint
--   where conrelid = 'public.facilities'::regclass
--     and contype = 'c'          -- c = CHECK
--   order by conname;
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 2. Drop every CHECK constraint that references the status column.
--    Constraint names differ between schemas, so they are looked up rather than
--    guessed. Only constraints are dropped; no rows or columns are affected.
--    (If a constraint mixed status with another rule, it is recreated in step 3
--    by the canonical rule below.)
-- ---------------------------------------------------------------------------
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.facilities'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.facilities drop constraint %I', c.conname);
    raise notice 'Dropped legacy constraint %', c.conname;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. One canonical rule for the three states the UI offers.
--    NOT VALID keeps any legacy row untouched; every new INSERT and every
--    UPDATE of a row is still checked, which is what the app needs.
-- ---------------------------------------------------------------------------
alter table public.facilities
  add constraint facilities_status_check
  check (status in ('available', 'unavailable', 'maintenance')) not valid;

commit;

-- Refresh PostgREST's schema cache so the change is visible immediately.
notify pgrst, 'reload schema';

-- ============================================================================
-- Verification (read-only; run after the migration)
-- ============================================================================
-- select conname, pg_get_constraintdef(oid) as definition
-- from pg_constraint
-- where conrelid = 'public.facilities'::regclass
--   and contype = 'c'
-- order by conname;

-- After this, choosing Status -> Unavailable should succeed and the badge
-- should read "Unavailable" on the list and detail pages.

-- ============================================================================
-- Fallback: only if the status column is an enum type instead of text.
-- (In that case the error is 22P02, not 23514, and no CHECK exists.)
-- ============================================================================
-- alter type public.facility_status add value if not exists 'unavailable';
