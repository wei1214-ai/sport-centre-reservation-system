import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Mail,
  Phone,
  ShieldAlert,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { AccountStatusDialog } from "@/components/admin/account-status-dialog";
import { InitialsAvatar, PageHeader, Pill } from "@/components/ui/primitives";
import { getManagedAccount } from "@/lib/admin-accounts";
import { requireRole } from "@/lib/auth";
import { formatDateOnly, relativeFromNow } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Account details" };

const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-page/60 p-4">
      <p className="text-[0.66rem] font-medium uppercase tracking-[0.12em] text-subtle">
        {label}
      </p>
      <p className="mt-1 truncate text-[0.88rem] font-medium text-ink">{value}</p>
    </div>
  );
}

export default async function AdminAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!ID_RE.test(id)) notFound();

  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const account = await getManagedAccount(supabase, id);
  if (!account) notFound();

  const { profile, trainer, suspendedByName, counts } = account;
  const isTrainer = profile.role === "trainer";
  const deleted = Boolean(profile.deleted_at);

  const statusPill = deleted ? (
    <Pill tone="neutral">Deleted</Pill>
  ) : profile.is_active ? (
    <Pill tone="success">Active</Pill>
  ) : (
    <Pill tone="danger">Suspended</Pill>
  );

  return (
    <div className="grid gap-5">
      <Link
        href="/admin/accounts"
        className="inline-flex w-fit items-center gap-1 text-[0.8rem] font-medium text-subtle transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        All accounts
      </Link>

      <PageHeader
        title={profile.full_name}
        subtitle={`${isTrainer ? "Trainer" : "Customer"} · joined ${relativeFromNow(profile.created_at)}`}
        slot={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {statusPill}
            {deleted ? null : (
              <AccountStatusDialog
                profileId={profile.id}
                fullName={profile.full_name}
                active={profile.is_active}
                triggerLabel={profile.is_active ? "Suspend account" : "Reactivate account"}
                triggerVariant={profile.is_active ? "danger" : "brand"}
                triggerSize="md"
              />
            )}
          </div>
        }
      />

      {deleted ? (
        <div className="surface flex items-start gap-3 border-warning/25 bg-warning-soft/40 p-4">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warning" />
          <div className="min-w-0">
            <p className="text-[0.92rem] font-semibold text-ink">
              Deleted by the account owner
            </p>
            <p className="text-[0.8rem] leading-relaxed text-subtle">
              Personal details were anonymised and sign-in was disabled. Historical
              bookings, payments and attendance were kept for audit and cannot be
              restored from this screen.
            </p>
          </div>
        </div>
      ) : profile.is_active ? (
        <div className="surface flex items-start gap-3 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-success-soft text-success">
            <BadgeCheck className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[0.92rem] font-semibold text-ink">Account is active</p>
            <p className="text-[0.8rem] leading-relaxed text-subtle">
              {profile.full_name.split(" ")[0]} can sign in and use the{" "}
              {isTrainer ? "trainer workspace" : "customer area"}. Suspend the
              account here if access must be stopped.
            </p>
          </div>
        </div>
      ) : (
        <div className="surface flex items-start gap-3 border-danger/20 bg-danger-soft/60 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-danger-soft text-danger">
            <ShieldAlert className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[0.92rem] font-semibold text-ink">Account is suspended</p>
            <p className="text-[0.8rem] leading-relaxed text-subtle">
              Sign-in is blocked and active sessions are redirected on their next
              page load.
            </p>
            <p className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-[0.78rem] text-ink">
              <span className="font-medium">Reason:</span>{" "}
              {profile.suspended_reason?.trim() || "No reason recorded"}
            </p>
            <p className="mt-1.5 text-[0.73rem] text-subtle">
              Suspended {relativeFromNow(profile.suspended_at)}
              {suspendedByName ? ` by ${suspendedByName}` : ""}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface grid content-start gap-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title">Account details</h2>
            <InitialsAvatar name={profile.full_name} className="size-9" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <DetailRow
              label="Email"
              value={
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <Mail className="size-3.5 shrink-0 text-subtle" />
                  <span className="truncate">{profile.email}</span>
                </span>
              }
            />
            <DetailRow
              label="Phone"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="size-3.5 text-subtle" />
                  {profile.phone || "Not provided"}
                </span>
              }
            />
            <DetailRow label="Role" value={isTrainer ? "Trainer" : "Customer"} />
            <DetailRow
              label="Date of birth"
              value={profile.date_of_birth ? formatDateOnly(profile.date_of_birth) : "Not provided"}
            />
            <DetailRow label="Gender" value={profile.gender || "Not provided"} />
            <DetailRow
              label="Last updated"
              value={relativeFromNow(profile.updated_at)}
            />
          </div>
        </section>

        <section className="surface grid content-start gap-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="section-title">Activity</h2>
            <Pill tone="neutral">Kept on suspension</Pill>
          </div>

          {counts.length ? (
            <div className="grid grid-cols-2 gap-3">
              {counts.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-line bg-page/60 p-4"
                >
                  <p className="text-[0.66rem] font-medium uppercase tracking-[0.12em] text-subtle">
                    {item.label}
                  </p>
                  <p className="display mt-1 text-[1.5rem] leading-none text-ink tabular-nums">
                    {item.value}
                  </p>
                  <p className="mt-1 text-[0.7rem] text-subtle">{item.hint}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-[0.8rem] text-subtle">
              No trainer profile is linked to this account yet.
            </p>
          )}

          <p className="flex items-start gap-2 border-t border-line pt-3 text-[0.74rem] leading-relaxed text-subtle">
            <CalendarDays className="mt-0.5 size-3.5 shrink-0" />
            Suspending does not cancel classes, bookings or payments. Review the
            timetable and reassign sessions where needed.
          </p>
        </section>
      </div>

      {isTrainer && trainer ? (
        <section className="surface grid content-start gap-4 p-5">
          <h2 className="section-title">Trainer profile</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailRow
              label="Specialisation"
              value={trainer.specialization || "Not provided"}
            />
            <DetailRow
              label="Experience"
              value={
                trainer.experience_years
                  ? `${trainer.experience_years} year${trainer.experience_years === 1 ? "" : "s"}`
                  : "Not provided"
              }
            />
            <DetailRow
              label="Contact email"
              value={trainer.contact_email || profile.email}
            />
            <DetailRow
              label="Contact phone"
              value={trainer.contact_phone || profile.phone || "Not provided"}
            />
          </div>
          {trainer.bio?.trim() ? (
            <p className="text-[0.82rem] leading-relaxed text-subtle">{trainer.bio}</p>
          ) : null}
        </section>
      ) : null}

      <section className="surface grid content-start gap-4 p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
            {profile.is_active ? (
              <ShieldCheck className="size-5" />
            ) : (
              <ShieldAlert className="size-5" />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-[0.95rem] font-medium text-ink">Account status</p>
            <p className="mt-1 text-[0.8rem] leading-relaxed text-subtle">
              Suspension is reversible and keeps every record. Permanent deletion is
              only available to the account owner from their own profile, which
              anonymises personal details and disables sign-in.
            </p>
          </div>
        </div>

        {deleted ? null : (
          <div className="flex flex-wrap items-center gap-2">
            <AccountStatusDialog
              profileId={profile.id}
              fullName={profile.full_name}
              active={profile.is_active}
              triggerLabel={profile.is_active ? "Suspend this account" : "Reactivate this account"}
              triggerVariant={profile.is_active ? "danger" : "brand"}
              triggerSize="md"
            />
            <span className="inline-flex items-center gap-1.5 text-[0.75rem] text-subtle">
              <UserRound className="size-3.5" />
              {profile.is_active
                ? "They can currently sign in."
                : "They cannot sign in until reactivated."}
            </span>
          </div>
        )}
      </section>
    </div>
  );
}
