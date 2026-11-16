"use client";

import { KeyRound, ShieldCheck, UserRound } from "lucide-react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs-dialog";
import {
  AdminPersonalDetailsForm,
  type AdminProfileFormValues,
} from "@/components/admin/personal-details-form";
import { AdminPasswordForm } from "@/components/admin/password-form";

export type AdminAccountInfo = {
  signInEmail: string;
  contactEmail: string;
  joined: string;
  lastUpdated: string;
};

export function AdminProfileTabs({
  personal,
  account,
}: {
  personal: AdminProfileFormValues;
  account: AdminAccountInfo;
}) {
  return (
    <Tabs defaultValue="personal" className="surface p-4 sm:p-5">
      <TabsList>
        <TabsTrigger value="personal">
          <UserRound className="size-3.5" />
          Personal
        </TabsTrigger>
        <TabsTrigger value="security">
          <KeyRound className="size-3.5" />
          Security
        </TabsTrigger>
        <TabsTrigger value="account">
          <ShieldCheck className="size-3.5" />
          Account
        </TabsTrigger>
      </TabsList>

      <TabsContent value="personal">
        <AdminPersonalDetailsForm initial={personal} />
      </TabsContent>

      <TabsContent value="security">
        <AdminPasswordForm />
      </TabsContent>

      <TabsContent value="account">
        <div className="grid gap-4">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
              <ShieldCheck className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[0.95rem] font-medium text-ink">
                Administrator account
              </p>
              <p className="mt-1 text-[0.83rem] leading-relaxed text-subtle">
                Your sign-in email is managed by Supabase Auth and cannot be
                changed from this page. Another administrator can update,
                deactivate or remove this account.
              </p>
            </div>
          </div>

          <dl className="grid gap-4 rounded-2xl border border-line bg-page/60 p-4 sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-subtle">
                Sign-in email
              </dt>
              <dd className="mt-1 truncate text-[0.85rem] text-ink">
                {account.signInEmail}
              </dd>
            </div>

            <div className="min-w-0">
              <dt className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-subtle">
                Contact email
              </dt>
              <dd className="mt-1 truncate text-[0.85rem] text-ink">
                {account.contactEmail}
              </dd>
            </div>

            <div className="min-w-0">
              <dt className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-subtle">
                Role
              </dt>
              <dd className="mt-1 text-[0.85rem] text-ink">Administrator</dd>
            </div>

            <div className="min-w-0">
              <dt className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-subtle">
                Member since
              </dt>
              <dd className="mt-1 text-[0.85rem] text-ink">{account.joined}</dd>
            </div>

            <div className="min-w-0">
              <dt className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-subtle">
                Last updated
              </dt>
              <dd className="mt-1 text-[0.85rem] text-ink">
                {account.lastUpdated}
              </dd>
            </div>
          </dl>
        </div>
      </TabsContent>
    </Tabs>
  );
}
