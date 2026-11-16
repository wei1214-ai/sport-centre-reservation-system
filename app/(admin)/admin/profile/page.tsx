import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { InitialsAvatar, PageHeader, Pill } from "@/components/ui/primitives";
import {
  AdminProfileTabs,
  type AdminAccountInfo,
} from "@/components/admin/profile-tabs";
import type { AdminProfileFormValues } from "@/components/admin/personal-details-form";
import { relativeFromNow } from "@/lib/format";

export const metadata = { title: "My profile" };

export default async function AdminProfilePage() {
  const profile = await requireRole("admin");

  // The sign-in identity lives in Supabase Auth and can differ from the
  // contact email stored on the profile row.
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const signInEmail = auth.user?.email ?? profile.email;

  const personal: AdminProfileFormValues = {
    fullName: profile.full_name,
    email: profile.email,
    phone: profile.phone ?? "",
  };

  const account: AdminAccountInfo = {
    signInEmail,
    contactEmail: profile.email,
    joined: relativeFromNow(profile.created_at),
    lastUpdated: relativeFromNow(profile.updated_at),
  };

  return (
    <div className="grid gap-7">
      <PageHeader
        title="My profile"
        subtitle="Manage your administrator details and account security."
        slot={<Pill tone="brandSoft">Administrator</Pill>}
      />

      <div className="surface flex items-center gap-3.5 p-4">
        <InitialsAvatar name={profile.full_name} className="size-12 text-base" />
        <div className="min-w-0">
          <p className="truncate text-[0.95rem] font-semibold text-ink">
            {profile.full_name}
          </p>
          <p className="truncate text-[0.76rem] text-subtle">
            {signInEmail} · joined {relativeFromNow(profile.created_at)}
          </p>
        </div>
      </div>

      <AdminProfileTabs personal={personal} account={account} />
    </div>
  );
}
