import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth";
import { logoutAction } from "@/lib/auth-actions";

export default async function AdminLayout({
  children,
}: LayoutProps<"/admin">) {
  const profile = await requireRole("admin");

  return (
    <AppShell
      role="admin"
      user={{
        fullName: profile.full_name,
        role: profile.role,
        initials: profile.full_name
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase() ?? "")
          .join(""),
      }}
      logoutAction={logoutAction}
    >
      {children}
    </AppShell>
  );
}
