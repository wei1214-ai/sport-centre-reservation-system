import { Sparkles, Wifi } from "lucide-react";

import { PageHeader, Pill, EmptyState } from "@/components/ui/primitives";

export const metadata = { title: "Customer home" };

export default async function CustomerHomePage() {
  return (
    <div className="grid gap-5">
      <PageHeader
        title="Customer area"
        subtitle="Facility booking and classes arrive in the next milestone."
        slot={<Pill tone="brandSoft">MVP placeholder</Pill>}
      />
      <EmptyState
        icon={<Sparkles className="size-6" />}
        title="Customer module coming soon"
        description="Facility booking, class enrolment, timetables and training plans will appear here in the next development phase."
      />
    </div>
  );
}
