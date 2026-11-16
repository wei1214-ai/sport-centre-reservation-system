import { BookMarked } from "lucide-react";

import { EmptyState, PageHeader, Pill } from "@/components/ui/primitives";

export const metadata = { title: "My classes" };

export default function CustomerMyClassesPage() {
  return (
    <div className="grid gap-7">
      <PageHeader
        title="My classes"
        subtitle="Classes you have joined, with their trainer and session timetable."
        slot={<Pill tone="neutral">Coming soon</Pill>}
      />

      <EmptyState
        icon={<BookMarked className="size-6" />}
        title="My classes coming soon"
        description="Once class enrolment is available, the classes you join will appear here with their schedule, trainer and fee."
      />
    </div>
  );
}
