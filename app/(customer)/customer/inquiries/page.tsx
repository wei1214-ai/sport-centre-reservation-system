import { MessageSquareText } from "lucide-react";

import { EmptyState, PageHeader, Pill } from "@/components/ui/primitives";

export const metadata = { title: "Inquiries" };

export default function CustomerInquiriesPage() {
  return (
    <div className="grid gap-7">
      <PageHeader
        title="Inquiries"
        subtitle="Ask your trainer a question and read their reply."
        slot={<Pill tone="neutral">Coming soon</Pill>}
      />

      <EmptyState
        icon={<MessageSquareText className="size-6" />}
        title="Inquiries coming soon"
        description="Questions you send to trainers, and their answers, will be listed here once class messaging is available."
      />
    </div>
  );
}
