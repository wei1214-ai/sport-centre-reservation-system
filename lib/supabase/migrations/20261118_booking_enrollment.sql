-- Modules 5 + 6: bookings management, class browse/enrol/withdraw, daily jobs.
-- Safe to run more than once. Run in Supabase -> SQL Editor.
begin;

/* ------------------------------ Walk-in bookings ------------------------------ */
alter table public.facility_bookings add column if not exists walk_in_name  text;
alter table public.facility_bookings add column if not exists walk_in_phone text;

drop policy if exists fb_admin_all on public.facility_bookings;
create policy fb_admin_all on public.facility_bookings
  for all to authenticated
  using (public.sh_is_admin()) with check (public.sh_is_admin());

drop policy if exists bh_admin_customer_all on public.booking_reschedule_history;
alter table public.booking_reschedule_history enable row level security;
grant select, insert on table public.booking_reschedule_history to authenticated;
create policy bh_admin_customer_all on public.booking_reschedule_history
  for all to authenticated
  using (
    public.sh_is_admin() or exists (
      select 1 from public.facility_bookings b
      where b.id = booking_id and b.customer_id = public.sh_current_profile_id())
  )
  with check (
    public.sh_is_admin() or exists (
      select 1 from public.facility_bookings b
      where b.id = booking_id and b.customer_id = public.sh_current_profile_id())
  );

/* --------------------------- Customers browse classes --------------------------- */
alter table public.sports_classes  enable row level security;
alter table public.class_sessions  enable row level security;
alter table public.class_enrollments enable row level security;
alter table public.notifications   enable row level security;
alter table public.trainers        enable row level security;

grant select on table public.sports_classes, public.class_sessions, public.trainers to authenticated;
grant select on table public.class_enrollments to authenticated;
grant select, update on table public.notifications to authenticated;

drop policy if exists sc_authenticated_select on public.sports_classes;
create policy sc_authenticated_select on public.sports_classes
  for select to authenticated using (true);

drop policy if exists cs_authenticated_select on public.class_sessions;
create policy cs_authenticated_select on public.class_sessions
  for select to authenticated using (true);

drop policy if exists tr_authenticated_select on public.trainers;
create policy tr_authenticated_select on public.trainers
  for select to authenticated using (true);

-- Customers can read the names of trainers (so a class shows who teaches it).
drop policy if exists up_select_trainers on public.user_profiles;
create policy up_select_trainers on public.user_profiles
  for select to authenticated using (role = 'trainer');

drop policy if exists ce_customer_select_own on public.class_enrollments;
create policy ce_customer_select_own on public.class_enrollments
  for select to authenticated
  using (customer_id = public.sh_current_profile_id() or public.sh_is_admin());

drop policy if exists ce_admin_all on public.class_enrollments;
create policy ce_admin_all on public.class_enrollments
  for all to authenticated
  using (public.sh_is_admin()) with check (public.sh_is_admin());

drop policy if exists nt_select_own on public.notifications;
create policy nt_select_own on public.notifications
  for select to authenticated using (user_id = public.sh_current_profile_id());

drop policy if exists nt_update_own on public.notifications;
create policy nt_update_own on public.notifications
  for update to authenticated
  using (user_id = public.sh_current_profile_id())
  with check (user_id = public.sh_current_profile_id());

/* ----------------------------------- Functions ----------------------------------- */

-- Seats taken per class (customers cannot read other people's enrolment rows).
create or replace function public.class_enrolled_counts(p_class_ids uuid[])
returns table (class_id uuid, enrolled integer)
language sql stable security definer set search_path = public as $$
  select e.class_id, count(*)::int
  from public.class_enrollments e
  where e.class_id = any(p_class_ids) and e.status = 'active'
  group by e.class_id;
$$;

-- F6.1 - F6.4: seat check + enrolment + payment in ONE transaction.
create or replace function public.enroll_in_class(p_class_id uuid, p_payment_method text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.sh_current_profile_id();
  v_class public.sports_classes%rowtype;
  v_taken integer;
  v_enrollment uuid;
begin
  if v_me is null or not exists (
    select 1 from public.user_profiles where id = v_me and role = 'customer' and is_active) then
    raise exception 'Only active customers can enrol in classes.';
  end if;

  select * into v_class from public.sports_classes where id = p_class_id for update;
  if not found or v_class.status <> 'active' then
    raise exception 'This class is not open for enrolment.';
  end if;

  if exists (select 1 from public.class_enrollments
             where class_id = p_class_id and customer_id = v_me and status = 'active') then
    raise exception 'You are already enrolled in this class.';
  end if;

  select count(*) into v_taken from public.class_enrollments
   where class_id = p_class_id and status = 'active';
  if v_taken >= v_class.capacity then
    raise exception 'This class is full.';
  end if;

  select id into v_enrollment from public.class_enrollments
   where class_id = p_class_id and customer_id = v_me and status <> 'active' limit 1;

  if v_enrollment is null then
    insert into public.class_enrollments (class_id, customer_id, status, enrolled_at)
    values (p_class_id, v_me, 'active', now()) returning id into v_enrollment;
  else
    update public.class_enrollments set status = 'active', enrolled_at = now()
     where id = v_enrollment;
  end if;

  insert into public.payments
    (customer_id, enrollment_id, amount, payment_method, payment_status, transaction_reference, paid_at)
  values
    (v_me, v_enrollment, v_class.fee, p_payment_method, 'paid',
     'SIM-' || upper(to_hex((extract(epoch from clock_timestamp()) * 1000)::bigint)), now());

  return v_enrollment;
end $$;

-- Month N+1 onwards: pay the monthly fee (allowed from 7 days before it is due).
create or replace function public.renew_class_fee(p_enrollment_id uuid, p_payment_method text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.sh_current_profile_id();
  v_enr public.class_enrollments%rowtype;
  v_fee numeric;
  v_paid integer;
  v_due timestamptz;
begin
  select * into v_enr from public.class_enrollments
   where id = p_enrollment_id and customer_id = v_me and status = 'active' for update;
  if not found then raise exception 'Enrolment not found.'; end if;

  select fee into v_fee from public.sports_classes where id = v_enr.class_id;
  select count(*) into v_paid from public.payments
   where enrollment_id = v_enr.id and payment_status = 'paid' and paid_at >= v_enr.enrolled_at;
  v_due := v_enr.enrolled_at + (greatest(v_paid, 1) * interval '1 month');

  if now() < v_due - interval '7 days' then
    raise exception 'Your next monthly fee is not due yet.';
  end if;

  insert into public.payments
    (customer_id, enrollment_id, amount, payment_method, payment_status, transaction_reference, paid_at)
  values
    (v_me, v_enr.id, v_fee, p_payment_method, 'paid',
     'SIM-' || upper(to_hex((extract(epoch from clock_timestamp()) * 1000)::bigint)), now());
end $$;

-- F6.6: withdraw. No refund; the seat is freed because only 'active' rows count.
create or replace function public.withdraw_from_class(p_enrollment_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.class_enrollments set status = 'withdrawn'
   where id = p_enrollment_id
     and customer_id = public.sh_current_profile_id()
     and status = 'active';
  if not found then raise exception 'Enrolment not found.'; end if;
end $$;

-- F5.11 (reminder) + F6.7 (auto-removal). Call daily; admins can run it by hand.
create or replace function public.run_daily_jobs()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_reminders integer := 0;
  v_removed integer := 0;
  r record;
begin
  if auth.uid() is not null and not public.sh_is_admin() then
    raise exception 'Only administrators can run the daily jobs.';
  end if;

  -- Booking reminders for bookings that start tomorrow (centre time).
  for r in
    select b.id, b.customer_id, b.booking_reference, b.start_time, f.name as facility_name
    from public.facility_bookings b
    join public.facilities f on f.id = b.facility_id
    where b.status = 'confirmed' and b.class_id is null
      and (b.start_time at time zone 'Asia/Kuala_Lumpur')::date
          = (now() at time zone 'Asia/Kuala_Lumpur')::date + 1
      and not exists (
        select 1 from public.notifications n
        where n.user_id = b.customer_id and n.notification_type = 'booking'
          and n.title = 'Booking reminder' and n.message like '%' || b.booking_reference || '%')
  loop
    insert into public.notifications (user_id, title, message, notification_type, sent_at)
    values (r.customer_id, 'Booking reminder',
      'Reminder: booking ' || r.booking_reference || ' at ' || r.facility_name || ' starts tomorrow at '
        || to_char(r.start_time at time zone 'Asia/Kuala_Lumpur', 'HH24:MI')
        || '. Review it on your timetable (/customer/timetable).',
      'booking', now());
    v_reminders := v_reminders + 1;
  end loop;

  -- Remove customers whose monthly fee is unpaid past the due date.
  for r in
    select e.id, e.customer_id, c.title
    from public.class_enrollments e
    join public.sports_classes c on c.id = e.class_id
    where e.status = 'active'
      and e.enrolled_at + (greatest((
            select count(*) from public.payments p
             where p.enrollment_id = e.id and p.payment_status = 'paid'
               and p.paid_at >= e.enrolled_at), 1) * interval '1 month') < now()
  loop
    update public.class_enrollments set status = 'withdrawn' where id = r.id;
    insert into public.notifications (user_id, title, message, notification_type, sent_at)
    values (r.customer_id, 'Removed from class',
      'You were removed from "' || r.title || '" because the monthly fee was not paid by the due date.',
      'general', now());
    v_removed := v_removed + 1;
  end loop;

  return jsonb_build_object('reminders', v_reminders, 'removed', v_removed);
end $$;

grant execute on function public.class_enrolled_counts(uuid[]) to authenticated;
grant execute on function public.enroll_in_class(uuid, text) to authenticated;
grant execute on function public.renew_class_fee(uuid, text) to authenticated;
grant execute on function public.withdraw_from_class(uuid) to authenticated;
grant execute on function public.run_daily_jobs() to authenticated;

commit;

-- OPTIONAL (automatic daily run at 08:00 Malaysia time = 00:00 UTC):
-- create extension if not exists pg_cron;
-- select cron.schedule('daily-jobs', '0 0 * * *', $$select public.run_daily_jobs()$$);
