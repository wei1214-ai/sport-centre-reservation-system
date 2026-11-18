import Link from "next/link";
import { ArrowUpRight, Building2, ShieldCheck, Users } from "lucide-react";

import { PageHeader, Pill, StatBlock } from "@/components/ui/primitives";
import { getManagedAccountStats } from "@/lib/admin-accounts";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Admin home" };

export default async function AdminHomePage() {
  const profile = await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const stats = await getManagedAccountStats(supabase);

  const firstName = profile.full_name.split(/\s+/)[0] ?? "Administrator";

  return (
    <div className="grid gap-7">
      <PageHeader
        title={`Welcome, ${firstName}`}
        subtitle="Manage account access and the facility catalogue. Changes you make here are reversible and keep every historical record."
        slot={<Pill tone="brandSoft">Administrator</Pill>}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatBlock label="Managed accounts" value={stats.total} hint="customers and trainers" />
        <StatBlock label="Customers" value={stats.customers} hint="active or suspended" tone="brandSoft" />
        <StatBlock label="Trainers" value={stats.trainers} hint="active or suspended" />
        <StatBlock
          label="Suspended"
          value={stats.suspended}
          hint="cannot sign in"
          tone={stats.suspended ? "danger" : "neutral"}
        />
      </div>

      <div className="grid gap-3.5 md:grid-cols-2">
        <Link
          href="/admin/accounts"
          className="surface group flex items-start gap-4 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(12,12,13,0.08)]"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
            <Users className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-[0.98rem] font-medium text-ink">
              Accounts
              <ArrowUpRight className="size-3.5 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
            <span className="mt-1 block text-[0.82rem] leading-relaxed text-subtle">
              Search customers and trainers, review their activity and suspend or
              reinstate access without deleting records.
            </span>
          </span>
        </Link>

        <Link
          href="/facilities"
          className="surface group flex items-start gap-4 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(12,12,13,0.08)]"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
            <Building2 className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-[0.98rem] font-medium text-ink">
              Facilities
              <ArrowUpRight className="size-3.5 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
            <span className="mt-1 block text-[0.82rem] leading-relaxed text-subtle">
              Add courts and studios, adjust pricing and status, and check each
              facility&apos;s upcoming schedule.
            </span>
          </span>
        </Link>
      </div>

      <p className="flex items-center gap-2 text-[0.76rem] text-subtle">
        <ShieldCheck className="size-3.5" />
        Memberships, bookings, payments and reports arrive in later milestones.
      </p>
    </div>
  );
}
