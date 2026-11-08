import { LayoutDashboard } from "lucide-react";

import { PageHeader, EmptyState, Pill } from "@/components/ui/primitives";

export const metadata = { title: "Admin home" };

export default function AdminHomePage() {
  return (
    <div className="grid gap-5">
      <PageHeader
        title="Administration"
        subtitle="Operational dashboards arrive in a later milestone."
        slot={<Pill tone="brandSoft">MVP placeholder</Pill>}
      />
      <EmptyState
        icon={<LayoutDashboard className="size-6" />}
        title="Admin module coming soon"
        description="Customers, memberships, trainers, facilities, classes, bookings, payments and reports will be managed here."
      />
    </div>
  );
}
