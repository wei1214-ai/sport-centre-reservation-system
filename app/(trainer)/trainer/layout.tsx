import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth";
import { logoutAction } from "@/lib/auth-actions";

export default async function TrainerLayout({ children }: LayoutProps<"/trainer">) {
  const profile = await requireRole("trainer");

  return (
    <AppShell
      role="trainer"
      user={{
        fullName: profile.full_name,
        role: "trainer",
        initials: profile.full_name
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase() ?? "")
          .join(""),
        subtitle: "Trainer",
      }}
      logoutAction={logoutAction}
    >
      {children}
    </AppShell>
  );
}
