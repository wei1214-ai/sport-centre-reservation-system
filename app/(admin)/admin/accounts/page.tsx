import Link from "next/link";
import { SearchX, ShieldOff, UserRound, Users } from "lucide-react";

import { AccountFilters } from "@/components/admin/account-filters";
import { AccountStatusDialog } from "@/components/admin/account-status-dialog";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  InitialsAvatar,
  PageHeader,
  Pill,
  StatBlock,
} from "@/components/ui/primitives";
import {
  getManagedAccountStats,
  listManagedAccounts,
  normalizeAccountRole,
  normalizeAccountStatus,
} from "@/lib/admin-accounts";
import { requireRole } from "@/lib/auth";
import { relativeFromNow } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Accounts" };

type SearchParams = Promise<{
  q?: string | string[];
  role?: string | string[];
  status?: string | string[];
}>;

function single(value?: string | string[]): string {
  return typeof value === "string" ? value : "";
}

export default async function AdminAccountsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole("admin");

  const params = await searchParams;
  const query = single(params.q);
  const role = normalizeAccountRole(single(params.role));
  const status = normalizeAccountStatus(single(params.status));

  const supabase = await createSupabaseServerClient();
  const [list, stats] = await Promise.all([
    listManagedAccounts(supabase, { query, role, status }),
    getManagedAccountStats(supabase),
  ]);

  const filtering = Boolean(query || role || status);

  return (
    <div className="grid gap-7">
      <PageHeader
        title="Accounts"
        subtitle="Suspend or reinstate customer and trainer accounts. Records are always kept, so bookings, classes and payments stay intact."
        slot={
          stats.suspended ? (
            <Pill tone="danger">
              {stats.suspended} suspended
            </Pill>
          ) : (
            <Pill tone="success">All active</Pill>
          )
        }
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

      <AccountFilters
        key={`${query}|${role}|${status}`}
        initialQuery={query}
        activeRole={role}
        activeStatus={status}
        resultCount={list.accounts.length}
      />

      {list.failed ? (
        <p className="rounded-2xl bg-danger-soft px-3.5 py-3 text-[0.8rem] text-danger">
          Accounts could not be loaded right now. Please refresh the page and try
          again.
        </p>
      ) : null}

      {list.accounts.length ? (
        <div className="surface overflow-hidden">
          <div className="hidden gap-3 border-b border-line px-5 py-3 text-[0.66rem] font-medium uppercase tracking-[0.12em] text-subtle sm:grid sm:grid-cols-[minmax(0,1fr)_6.5rem_6rem_auto]">
            <span>Account</span>
            <span>Role</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>

          <ul className="divide-y divide-line">
            {list.accounts.map((account) => (
              <li
                key={account.id}
                className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_6.5rem_6rem_auto] sm:items-center"
              >
                <Link
                  href={`/admin/accounts/${account.id}`}
                  className="flex min-w-0 items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                >
                  <InitialsAvatar name={account.full_name} className="size-10 text-[0.8rem]" />
                  <span className="min-w-0">
                    <span className="block truncate text-[0.9rem] font-medium text-ink">
                      {account.full_name}
                    </span>
                    <span className="block truncate text-[0.76rem] text-subtle">
                      {account.email}
                    </span>
                    <span className="mt-0.5 block text-[0.7rem] text-subtle">
                      Joined {relativeFromNow(account.created_at)}
                    </span>
                  </span>
                </Link>

                <div className="flex flex-wrap items-center gap-1.5 sm:contents">
                  <span>
                    <Pill tone={account.role === "trainer" ? "brandSoft" : "neutral"}>
                      {account.role === "trainer" ? "Trainer" : "Customer"}
                    </Pill>
                  </span>
                  <span>
                    <Pill tone={account.is_active ? "success" : "danger"}>
                      {account.is_active ? "Active" : "Suspended"}
                    </Pill>
                  </span>
                </div>

                <div className="flex items-center justify-end gap-1.5">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/admin/accounts/${account.id}`}>View</Link>
                  </Button>
                  <AccountStatusDialog
                    profileId={account.id}
                    fullName={account.full_name}
                    active={account.is_active}
                    triggerLabel={account.is_active ? "Suspend" : "Reactivate"}
                    triggerVariant={account.is_active ? "subtle" : "outline"}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <EmptyState
          className="border-dashed"
          icon={filtering ? <SearchX className="size-6" /> : <Users className="size-6" />}
          title={filtering ? "No accounts match your filters" : "No accounts yet"}
          description={
            filtering
              ? "Try a different name, email or phone, or clear the role and status filters."
              : "Customer and trainer accounts appear here as soon as they register."
          }
          action={
            filtering ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/accounts">Clear filters</Link>
              </Button>
            ) : undefined
          }
        />
      )}

      <div className="flex items-start gap-2 text-[0.76rem] leading-relaxed text-subtle">
        <ShieldOff className="mt-0.5 size-3.5 shrink-0" />
        <p>
          Suspending never deletes a record: bookings, classes, payments and
          attendance remain for reporting. Accounts deleted by their owner are
          anonymised and hidden from this list.
          {stats.active ? (
            <>
              {" "}
              <UserRound className="inline size-3" /> {stats.active} accounts can
              currently sign in.
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}
