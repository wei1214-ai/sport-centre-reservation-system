import { ClipboardCheck } from "lucide-react";

import { EmptyState, PageHeader, Pill } from "@/components/ui/primitives";

export const metadata = { title: "Attendance" };

export default function CustomerAttendancePage() {
  return (
    <div className="grid gap-7">
      <PageHeader
        title="Attendance"
        subtitle="Your attendance record for the class sessions you are enrolled in."
        slot={<Pill tone="neutral">Coming soon</Pill>}
      />

      <EmptyState
        icon={<ClipboardCheck className="size-6" />}
        title="Attendance coming soon"
        description="Once class enrolment and attendance marking are available, each session will show whether you were present, late or absent."
      />
    </div>
  );
}
