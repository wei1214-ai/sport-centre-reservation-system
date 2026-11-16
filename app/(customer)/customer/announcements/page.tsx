import { Megaphone } from "lucide-react";

import { EmptyState, PageHeader, Pill } from "@/components/ui/primitives";

export const metadata = { title: "Announcements" };

export default function CustomerAnnouncementsPage() {
  return (
    <div className="grid gap-7">
      <PageHeader
        title="Announcements"
        subtitle="Updates from your trainers and the sport centre."
        slot={<Pill tone="neutral">Coming soon</Pill>}
      />

      <EmptyState
        icon={<Megaphone className="size-6" />}
        title="Announcements coming soon"
        description="Class changes, closures and centre notices will appear here once the announcements module is available."
      />
    </div>
  );
}
