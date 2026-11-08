-- Migration: class monthly fee + facility booking per session.
-- Run this once in Supabase Dashboard -> SQL Editor (as project owner).
-- No rows are deleted; existing classes keep their data.
-- 1) sports_classes.fee becomes the MONTHLY fee.
-- 2) Add sessions_per_month so the UI can show monthly and per-session prices.
alter table public.sports_classes
    add column if not exists sessions_per_month integer not null default 8;

comment on column public.sports_classes.fee is 'Monthly class fee in RM (set by the trainer).';
comment on column public.sports_classes.sessions_per_month is 'Number of sessions per month; per-session price = fee / sessions_per_month.';

-- 3) Classes are created WITHOUT a facility; the facility is chosen when a
--    session is scheduled. Keep the column for old rows that already have one.
alter table public.sports_classes
    alter column facility_id drop not null;

comment on column public.sports_classes.facility_id is 'Legacy / default venue. New classes leave this null; each session picks its facility via facility_bookings.';

-- 4) Link a facility booking to the class and session it serves.
alter table public.facility_bookings
    add column if not exists class_id uuid references public.sports_classes(id) on delete set null;

alter table public.facility_bookings
    add column if not exists session_id uuid references public.class_sessions(id) on delete set null;

create index if not exists facility_bookings_class_id_idx on public.facility_bookings(class_id);
create index if not exists facility_bookings_session_id_idx on public.facility_bookings(session_id);

comment on column public.facility_bookings.class_id is 'Class this booking serves (trainer class bookings). Null for plain customer bookings.';
comment on column public.facility_bookings.session_id is 'Class session this booking reserves the facility for. Null for plain customer bookings.';
