import { AppShell } from "@/components/layout/app-shell";
import { logoutAction } from "@/lib/auth-actions";
import { requireActiveProfile } from "@/lib/auth";

/**
 * Shared facility catalogue.
 *
 * Every signed-in role can browse it, so the layout (not a role-specific
 * route group) decides which navigation to show from the profile's role.
 */
export default async function FacilitiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireActiveProfile();

  return (
    <AppShell
      role={profile.role}
      user={{
        fullName: profile.full_name,
        role: profile.role,
        initials: profile.full_name
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase() ?? "")
          .join(""),
        subtitle:
          profile.role === "admin"
            ? "Administrator"
            : profile.role === "trainer"
              ? "Trainer"
              : "Customer",
      }}
      logoutAction={logoutAction}
    >
      {children}
    </AppShell>
  );
}
